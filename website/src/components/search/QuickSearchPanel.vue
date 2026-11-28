<template>
  <div class="box" @keydown="onKeydown">
    <div class="top">
      <IconSearch class="lens" aria-hidden="true" />
      <input
        ref="field"
        v-model="input"
        type="search"
        role="combobox"
        aria-label="Wort oder Bedeutung suchen"
        aria-expanded="true"
        :aria-controls="LIST_ID"
        aria-autocomplete="list"
        :aria-activedescendant="activeId"
        :placeholder="wide ? 'Such ’n Wort oder wat et bedeutet' : 'Wort oder Bedeutung'"
        :maxlength="MAX_QUERY"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        enterkeyhint="go"
      />
      <button v-if="input" type="button" class="clear" aria-label="Suche leeren" @click="clear">
        <IconX aria-hidden="true" />
      </button>
      <!-- The name keeps the visible „esc“ (label-content-name-mismatch) and says what it does. -->
      <button v-if="wide" type="button" class="esc" @click="emit('close')">
        esc<span class="u-sr-only"> Schließen</span>
      </button>
      <button v-else type="button" class="cancel" @click="emit('close')">Abbrechen</button>
    </div>

    <div class="body">
      <SearchLoadState v-if="loadError" :online="online" @retry="load" />
      <div
        v-else-if="skeleton"
        class="skeleton"
        role="progressbar"
        aria-busy="true"
        aria-label="Treffer werden jeladen"
      >
        <div v-for="n in 4" :key="n" class="bone"><i /><i /></div>
      </div>
      <div v-if="!skeleton && model?.mode === 'none'" class="none">
        <BerlinerBaer mood="blank" :size="84" />
        <div>
          <h2>Nüscht jefunden für „{{ model.q }}“</h2>
          <p>Weder im Wort noch in den Bedeutungen.</p>
          <p v-if="model.meinste.length" class="maybe">
            <span class="label">Meinste</span>
            <a v-for="s in model.meinste" :key="s.slug" :href="`/wort/${s.slug}`">
              {{ s.wordProperties.berlinerisch }}
            </a>
          </p>
        </div>
      </div>
      <QuickSearchList
        v-if="model && !skeleton"
        :id="LIST_ID"
        :model
        :active-id="activeId"
        :ctx
        :mobile="!wide"
        @pick="(o) => act(optionIntent(o, model!.q))"
        @remove="history.remove"
        @clear-history="history.clear"
      />
    </div>

    <div class="foot">
      <template v-if="footMode === 'idle'">
        <nav class="links" aria-label="Mehr">
          <a :href="randomHref"><IconShuffle aria-hidden="true" />Zufälliges Wort</a>
          <a href="/wort-vorschlagen"><IconPlus aria-hidden="true" />Wort vorschlagen</a>
        </nav>
        <span v-if="onHistory" class="hint"><kbd>Entf</kbd> aus Verlauf entfernen</span>
      </template>
      <template v-else>
        <span class="hint">
          <kbd><IconUp aria-label="Pfeil hoch" /></kbd
          ><kbd><IconDown aria-label="Pfeil runter" /></kbd>
          navigieren
        </span>
        <span class="hint"
          ><kbd><IconEnter aria-label="Enter" /></kbd> öffnen</span
        >
        <span class="hint">
          <kbd>{{ modKey }}</kbd><kbd><IconEnter aria-label="Enter" /></kbd> alle Treffer
        </span>
      </template>
      <span class="spacer" />
      <a class="full" :href="fullHref">
        {{ footMode === "hits" ? "Zur Suchseite" : "Alle Wörter A–Z" }}
        <IconArrow aria-hidden="true" />
      </a>
    </div>

    <p class="u-sr-only" aria-live="polite">{{ announced }}</p>
  </div>
</template>

<script setup lang="ts">
import type { SearchContext } from "@lib/search/run";

import BerlinerBaer from "@components/kalle/BerlinerBaer.vue";
import { useSearchHistory } from "@composables/useSearchHistory";
import { useSearchIndex } from "@composables/useSearchIndex";
import { searchUrl } from "@composables/useSearchState";
import { useSearchTracking } from "@composables/useSearchTracking";
import {
  activeDescendant,
  keyIntent,
  moveActive,
  optionIntent,
  quickModel,
  type QuickIntent,
  type QuickModel,
} from "@lib/search/quick";
import { quickContext } from "@lib/search/quickContext";
import { EMPTY_STATE } from "@lib/search/state";
import { MAX_QUERY } from "@lib/search/url";
import { reportError } from "@utils/reportError.ts";
import { refDebounced, useThrottleFn } from "@vueuse/core";
import { navigate } from "astro:transitions/client";
import {
  computed,
  defineAsyncComponent,
  nextTick,
  ref,
  shallowRef,
  useTemplateRef,
  watch,
} from "vue";

import QuickSearchList from "./QuickSearchList.vue";
import SearchLoadState from "./SearchLoadState.vue";

/** Field, list and footer of the quick search dialog (SPEC §20–§24); the dialog itself is QuickSearch.vue. */
const props = defineProps<{ open: boolean; wide: boolean }>();
const emit = defineEmits<{ close: [] }>();

const LIST_ID = "schnellsuche-liste";
const TYPE_DEBOUNCE = 120; // SPEC §21.2
const SKELETON_AFTER = 300; // SPEC §21.5
const ANNOUNCE_EVERY = 500; // SPEC §24

const IconSearch = defineAsyncComponent(() => import("virtual:icons/lucide/search"));
const IconX = defineAsyncComponent(() => import("virtual:icons/lucide/x"));
const IconShuffle = defineAsyncComponent(() => import("virtual:icons/lucide/shuffle"));
const IconPlus = defineAsyncComponent(() => import("virtual:icons/lucide/plus"));
const IconArrow = defineAsyncComponent(() => import("virtual:icons/lucide/arrow-right"));
const IconUp = defineAsyncComponent(() => import("virtual:icons/lucide/arrow-up"));
const IconDown = defineAsyncComponent(() => import("virtual:icons/lucide/arrow-down"));
const IconEnter = defineAsyncComponent(() => import("virtual:icons/lucide/corner-down-left"));

const modKey = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Strg";

const field = useTemplateRef("field");
const input = ref("");
const debounced = refDebounced(input, TYPE_DEBOUNCE);
// Clearing is instant (Esc, X, reopen): the empty state needs no debounce.
const query = computed(() => (input.value.trim() ? debounced.value.trim() : ""));

const history = useSearchHistory();
const ctx = shallowRef<SearchContext>({ trendRanks: new Map() });
const model = shallowRef<QuickModel>();
const active = ref(-1);
const activeId = computed(() =>
  model.value ? activeDescendant(model.value, active.value) : undefined,
);
const randomHref = ref("/wort");

const { index, load, loadError, online } = useSearchIndex(() => {
  pickRandom();
  void run();
});
const track = useSearchTracking();

const announced = ref("");
const announce = useThrottleFn((text: string) => (announced.value = text), ANNOUNCE_EVERY, true);

/* A newer run wins. */
let runId = 0;
async function run() {
  const id = ++runId;
  const idx = index.value;
  if (!idx) return; // loading: the index runs it once it is there
  const q = query.value;
  try {
    const next = await quickModel(idx.db, idx.entries, q, ctx.value, {
      history: history.recent.value,
      ki: false, // TODO(schnellsuche): KI rows and Shift+Enter come with Task 18 (SemanticSearch row variant).
    });
    if (id !== runId) return;
    model.value = next;
    active.value = next.active;
    if (!q) return;
    track(q, next.total);
    void announce(
      next.mode === "none" ? "Keene Treffer" : `${next.total.toLocaleString("de")} Treffer`,
    );
  } catch (error) {
    if (id !== runId) return;
    reportError(error);
    loadError.value = true;
  }
}
watch([query, ctx, history.recent], run);

/* Skeleton (SPEC §21.5): only after 300 ms without an answer, and never over old hits. */
const waiting = computed(
  () => !model.value || model.value.q !== query.value || input.value.trim() !== query.value,
);
const slow = ref(false);
let slowTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  waiting,
  (now) => {
    clearTimeout(slowTimer);
    slow.value = false;
    if (now) slowTimer = setTimeout(() => (slow.value = true), SKELETON_AFTER);
  },
  { immediate: true },
);
const skeleton = computed(
  () =>
    waiting.value &&
    slow.value &&
    (!model.value || (model.value.mode === "idle" && !!input.value.trim())),
);

function pickRandom() {
  const entries = index.value?.entries;
  const pick = entries?.[Math.floor(Math.random() * entries.length)];
  randomHref.value = pick ? `/wort/${pick.slug}` : "/wort";
}

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    // SPEC §19: empty field on every open.
    input.value = "";
    active.value = model.value?.mode === "idle" ? -1 : active.value;
    pickRandom();
    if (!index.value) void load();
    void quickContext().then((c) => (ctx.value = c));
    void nextTick(() => field.value?.focus());
  },
  { immediate: true },
);

watch(activeId, async (id) => {
  if (!id) return;
  await nextTick();
  document.getElementById(id)?.scrollIntoView?.({ block: "nearest" });
});

const footMode = computed(() => model.value?.mode ?? (input.value.trim() ? "hits" : "idle"));
const fullHref = computed(() =>
  footMode.value === "hits" ? searchUrl({ ...EMPTY_STATE, q: input.value.trim() }) : "/wort",
);
const onHistory = computed(() => model.value?.options[active.value]?.kind === "history");

function clear() {
  input.value = "";
  field.value?.focus();
}

/** Runs what a key or a click chose (SPEC §19: the query goes into the history when a hit or action is chosen). */
function act(intent: QuickIntent) {
  switch (intent.type) {
    case "fill":
      input.value = intent.term;
      field.value?.focus();
      return;
    case "remove-history":
      history.remove(intent.term);
      active.value = -1;
      return;
    case "ki":
      return; // Task 18
    default:
      history.save(model.value?.q ?? "");
      emit("close");
      void navigate(intent.href);
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    // SPEC §23: the first Esc clears the field, the next one is the dialog's close request.
    if (input.value) {
      e.preventDefault();
      clear();
    }
    return;
  }
  const m = model.value;
  if (e.target !== field.value || !m) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    active.value = moveActive(active.value, e.key === "ArrowDown" ? 1 : -1, m.options.length);
    return;
  }
  const intent = keyIntent(m, active.value, e);
  if (!intent) return;
  e.preventDefault();
  act(intent);
}
</script>
