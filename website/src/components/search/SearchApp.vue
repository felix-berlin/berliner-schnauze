<template>
  <section class="c-search-app">
    <header class="head">
      <h1>Wörter suchen</h1>
      <p>
        {{ formatCount(meta.totalWords) }} Wörter und Redewendungen. Such uff Berlinerisch oder
        Hochdeutsch.
      </p>
    </header>

    <form role="search" method="get" action="/wort" @submit="onSubmit">
      <SearchField
        ref="field"
        v-model="input"
        :active-id="activeId"
        :expanded="!skeleton && rows.length > 0"
        :ai="!!ai"
        :ai-pressed="semantic?.pressed"
        :ai-list="aiHits.length > 0"
        @keydown="onKeydown"
        @ai="startAi"
        @ai-warm="semantic?.warm()"
      />
      <input v-for="[key, value] in kept" :key="key" type="hidden" :name="key" :value="value" />
    </form>

    <div class="meta">
      <p data-meta>
        <template v-if="skeleton">Suche läuft …</template>
        <template v-else-if="result.total === 0 && byFilters"
          >Keene Treffer mit diesen Filtern</template
        >
        <template v-else-if="result.total === 0">Keene Treffer für „<b>{{ shown.q }}</b>“</template>
        <template v-else-if="shown.q">
          <b>{{ formatCount(result.total) }}</b> Treffer für „{{ shown.q }}“
        </template>
        <template v-else><b>{{ formatCount(result.total) }}</b> Wörter</template>
      </p>
      <p class="keys" aria-hidden="true">
        <span><kbd>↑</kbd><kbd>↓</kbd> navigieren</span>
        <span><kbd>↵</kbd> öffnen</span>
        <span v-if="ai"><kbd>Shift</kbd><kbd>↵</kbd> nach Bedeutung</span>
      </p>
      <!-- Tablet (808–999px, SPEC §3.1) only: the chips and the sort no longer fit in one row. -->
      <div class="tsort"><SortSelect :state="state" compact @update="set" /></div>
    </div>
    <p class="u-sr-only" aria-live="polite">{{ announcement }}</p>

    <!-- Mobile (< 808px): filter button + sheet and the sort pill; tablet and desktop: the filter bar. -->
    <div class="mobile">
      <FilterSheet
        ref="sheet"
        :state="state"
        :facets="result.facets"
        :total="result.total"
        :meta="meta"
        @update="set"
        @reset="reset"
        @hidden="focusFilters"
      />
      <SortSelect :state="state" compact @update="set" />
    </div>
    <div class="filters">
      <FilterBar
        ref="bar"
        :state="state"
        :facets="result.facets"
        :total="result.total"
        :meta="meta"
        @update="set"
      />
    </div>
    <ActiveFilters :state="state" :meta="meta" @update="set" @reset="resetFilters" />

    <SearchLoadState v-if="loadError" :online="online" @retry="load" />

    <SemanticSearch
      v-if="ai"
      ref="semantic"
      :availability="ai"
      :state="state"
      :find="findCandidates"
      :trend-ranks="ctx.trendRanks"
      :wotd="wotd"
      :active-slug="aiActive >= 0 ? aiHits[aiActive]?.slug : undefined"
      @refocus="field?.focusAi()"
    />

    <HitSkeleton v-if="skeleton" />
    <SearchEmpty
      v-else-if="result.total === 0"
      :q="shown.q"
      :by-filters="byFilters"
      :suggestions="result.suggestions"
      :ai="!!ai"
      @reset="resetFilters"
      @ai="startAi"
    />
    <template v-else>
      <AlphabetRegister v-if="!shown.q" :letters="letters" :current="currentLetter" @jump="jump" />
      <div v-else class="section">
        <h2>Treffer</h2>
        <small v-if="result.note">{{ result.note }}</small>
      </div>
      <HitList
        ref="list"
        :rows="rows"
        :q="shown.q"
        :active-index="activeIndex"
        :wotd="wotd"
        :trend-ranks="ctx.trendRanks"
        :scope="shown"
        :ssr-count="ssrCount"
        @top="topIndex = $event"
      />
    </template>
  </section>
</template>

<script setup lang="ts">
import type { SearchResult } from "@lib/search/run";
import type { Availability } from "@lib/search/semantic";

import { useSearchIndex } from "@composables/useSearchIndex";
import { useSearchState } from "@composables/useSearchState";
import { useSearchTracking } from "@composables/useSearchTracking";
import { runSearch, semanticCandidates } from "@lib/search/run";
import { isFiltered, type SearchState } from "@lib/search/state";
import { toParams } from "@lib/search/url";
import { isEditableTarget } from "@utils/helpers.ts";
import { reportError } from "@utils/reportError.ts";
import { refThrottled, useEventListener, useTimeoutFn, watchDebounced } from "@vueuse/core";
import { navigate } from "astro:transitions/client";
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onMounted,
  ref,
  shallowRef,
  useTemplateRef,
  watch,
} from "vue";

import type SemanticBlock from "./SemanticSearch.vue";

import ActiveFilters from "./ActiveFilters.vue";
import AlphabetRegister from "./AlphabetRegister.vue";
import FilterBar from "./FilterBar.vue";
import FilterSheet from "./FilterSheet.vue";
import HitList from "./HitList.vue";
import HitSkeleton from "./HitSkeleton.vue";
import SearchEmpty from "./SearchEmpty.vue";
import SearchField from "./SearchField.vue";
import SearchLoadState from "./SearchLoadState.vue";
import SortSelect from "./SortSelect.vue";

// Loaded only when the Chrome AI is there: the Prompt API code stays out of this chunk.
const SemanticSearch = defineAsyncComponent(() => import("./SemanticSearch.vue"));

const props = defineProps<{
  state: SearchState;
  result: SearchResult;
  meta: {
    themes: { name: string; slug: string }[];
    pos: string[];
    areas: { key: string; name: string }[];
    letters: { letter: string; count: number }[];
    totalWords: number;
  };
  wotd?: string;
  /** Slugs of the trend list, rank 1 first. */
  trend?: string[];
}>();

const TYPE_DEBOUNCE = 150; // SPEC §5
const SKELETON_DELAY = 300; // SPEC §9
const ANNOUNCE_THROTTLE = 500; // SPEC §12

const formatCount = (n: number) => n.toLocaleString("de");

const { reset, set, state } = useSearchState(props.state, {
  areas: props.meta.areas.map((a) => a.key),
  pos: props.meta.pos,
  themes: props.meta.themes.map((t) => t.slug),
});
const ctx = {
  trendRanks: new Map((props.trend ?? []).map((slug, i) => [slug, i + 1])),
  wotd: props.wotd,
};

// The answer on screen and the state it belongs to: old rows stay until a new answer is there (SPEC §9).
const result = shallowRef<SearchResult>(props.result);
const shown = shallowRef<SearchState>(props.state);
const rows = computed(() => result.value.rows);
const ssrCount = props.result.rows.length;
const byFilters = computed(() => isFiltered(shown.value) && result.value.unfiltered > 0);

// The no-JS form keeps the active filters; only the typed query is replaced.
const kept = computed(() => [...toParams({ ...state.value, q: "" })]);

const input = ref(props.state.q);
watchDebounced(input, (q) => q.trim() !== state.value.q && set({ q: q.trim() }), {
  debounce: TYPE_DEBOUNCE,
});
// Back/forward changes the state: the field follows.
watch(
  () => state.value.q,
  (q) => q !== input.value.trim() && (input.value = q),
);

/* Clearing the last filter removes the control that had focus (the active-filter group, later the empty state):
   focus goes to the first filter chip instead of falling to <body>. */
const bar = useTemplateRef("bar");
const sheet = useTemplateRef("sheet");
function focusFilters() {
  const before = document.activeElement;
  bar.value?.focus();
  // Below 808px the bar is display: none and takes no focus: the mobile filter button does.
  if (document.activeElement === before) sheet.value?.focus();
}
function resetFilters() {
  reset();
  focusFilters();
}
watch(
  () => isFiltered(state.value),
  async (now, before) => {
    if (!before || now) return;
    await nextTick();
    if (document.activeElement === document.body) focusFilters();
  },
);

/* Index: loaded once per page; until it is there the server rows stand, no skeleton. */
const { index, load, loadError, online, ready, settled } = useSearchIndex(() => void run());
onMounted(load);
const track = useSearchTracking();

/* Search runs; a newer run wins. */
const pending = ref(false);
const touched = ref(false);
let runId = 0;

async function run() {
  const idx = index.value;
  if (!idx) return;
  const id = ++runId;
  const s = state.value;
  try {
    const next = await runSearch(idx.db, idx.entries, s, ctx);
    if (id !== runId) return;
    result.value = next;
    shown.value = s;
    activeIndex.value = -1;
    track(s.q, next.total);
  } catch (error) {
    if (id !== runId) return;
    reportError(error);
    loadError.value = true; // shows the error strip; its retry runs the search again
  }
  pending.value = false;
}

watch(state, () => {
  pending.value = true;
  touched.value = true;
  void run();
});

const slow = ref(false);
const { start: startSlow, stop: stopSlow } = useTimeoutFn(
  () => (slow.value = true),
  SKELETON_DELAY,
  { immediate: false },
);
watch(pending, (p) => {
  slow.value = false;
  if (p) startSlow();
  else stopSlow();
});
const skeleton = computed(() => slow.value && ready.value && !loadError.value);

const announcement = refThrottled(
  computed(() => {
    if (!touched.value || pending.value) return "";
    return result.value.total ? `${formatCount(result.value.total)} Treffer` : "Keene Treffer";
  }),
  ANNOUNCE_THROTTLE,
);

/* Combobox (SPEC §12): focus stays in the field, ↑/↓ move the active option. */
const field = useTemplateRef("field");
const list = useTemplateRef("list");
const activeIndex = ref(-1);
const activeId = ref<string>();
watch(activeIndex, (i) => {
  if (i < 0 && aiActive.value < 0) activeId.value = undefined;
});
const hitIndices = computed(() => rows.value.flatMap((row, i) => (row.kind === "hit" ? [i] : [])));

// SPEC §8.3: with a KI result ↑/↓ start in the KI block and run on into the keyword hits.
async function move(delta: 1 | -1) {
  const hits = hitIndices.value;
  const ais = aiHits.value.length;
  const total = ais + hits.length;
  if (!total) return;
  const at = aiActive.value >= 0 ? aiActive.value : hits.indexOf(activeIndex.value);
  const current = aiActive.value >= 0 || at < 0 ? at : ais + at;
  const next = current < 0 ? (delta > 0 ? 0 : total - 1) : (current + delta + total) % total;
  if (next < ais) {
    aiActive.value = next;
    activeIndex.value = -1;
    activeId.value = `ki-${aiHits.value[next]!.slug}`;
    await nextTick();
    document.getElementById(activeId.value)?.scrollIntoView({ block: "nearest" });
    return;
  }
  aiActive.value = -1;
  const i = hits[next - ais]!;
  activeIndex.value = i;
  // The row may not be rendered yet: scroll first, point aria-activedescendant at it once it exists.
  list.value?.scrollToIndex(i);
  await nextTick();
  const row = rows.value[i];
  if (row?.kind === "hit" && activeIndex.value === i)
    activeId.value = `treffer-${row.hit.entry.slug}`;
}

function onKeydown(e: KeyboardEvent) {
  const el = e.target as HTMLInputElement;
  switch (e.key) {
    case "ArrowDown":
    case "ArrowUp":
      e.preventDefault();
      void move(e.key === "ArrowDown" ? 1 : -1);
      return;
    case "Enter": {
      if (e.shiftKey) {
        if (!ai.value) return;
        e.preventDefault();
        void startAi();
        return;
      }
      const picked = aiHits.value[aiActive.value];
      if (picked) {
        e.preventDefault();
        void navigate(`/wort/${picked.slug}`);
        return;
      }
      const row = rows.value[activeIndex.value];
      if (row?.kind !== "hit") {
        el.blur(); // no option: the list is live already, Enter just closes the keyboard
        return;
      }
      e.preventDefault();
      void navigate(`/wort/${row.hit.entry.slug}`);
      return;
    }
    case "Escape":
      if (input.value) {
        e.preventDefault();
        input.value = "";
      } else el.blur();
      return;
  }
}

/* Meaning search (SPEC §8): only where Chrome's on-device model exists; the module is loaded after mount. */
const ai = ref<Exclude<Availability, "unavailable">>();
const semantic = useTemplateRef<InstanceType<typeof SemanticBlock>>("semantic");
const aiHits = computed(() => semantic.value?.hits ?? []);
const aiActive = ref(-1);
watch(aiHits, () => {
  if (aiActive.value >= 0) activeId.value = undefined;
  aiActive.value = -1;
});
async function detectAi() {
  const { detectAvailability } = await import("@lib/search/semantic");
  const a = await detectAvailability();
  ai.value = a === "unavailable" ? undefined : a;
}
onMounted(detectAi);
// Back from bfcache: the base was destroyed on pagehide and the model may be downloaded by now.
useEventListener("pageshow", (e: PageTransitionEvent) => e.persisted && void detectAi());

/** Waits for the index while it loads; without one (failed, offline) the block shows its error state. */
async function findCandidates(s: SearchState) {
  if (!index.value) await settled();
  if (!index.value) throw new Error("search index unavailable for the meaning search");
  return semanticCandidates(index.value.db, index.value.entries, s);
}

/** A trigger right after typing: the debounced query is set first, so the block searches what is typed. */
async function startAi() {
  const q = input.value.trim();
  if (q !== state.value.q) set({ q });
  await nextTick();
  semantic.value?.start();
}

// With the index the list is live; without it (failed load) Enter sends the form to the server.
const onSubmit = (e: Event) => index.value && e.preventDefault();

// "/" focuses the field unless a field has focus. Window capture runs before the header's listener;
// stopping it there keeps the header's search modal closed (same as HomeSearch).
useEventListener(
  "keydown",
  (e: KeyboardEvent) => {
    if (e.key !== "/" || e.repeat || isEditableTarget(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    field.value?.focus();
  },
  { capture: true },
);

/* Register (SPEC §6.4): letters in German order, scroll-spy from the first visible row. */
const letters = computed(() =>
  props.meta.letters
    .map(({ letter }) => ({ count: result.value.facets.letters[letter] ?? 0, letter }))
    .sort((a, b) => a.letter.localeCompare(b.letter, "de")),
);
const topIndex = ref(0);
const currentLetter = computed(() => {
  for (let i = Math.min(topIndex.value, rows.value.length - 1); i >= 0; i--) {
    const row = rows.value[i];
    if (row?.kind === "letter") return row.letter;
  }
  return shown.value.letter;
});

function jump(letter: string) {
  const i = rows.value.findIndex((row) => row.kind === "letter" && row.letter === letter);
  if (i >= 0) list.value?.scrollToIndex(i, { align: "start" });
  else set({ letter }); // a letter filter (?buchstabe=) hides the other letters' rows
}
</script>

<style lang="scss">
@use "@styles/components/search-app";
</style>
