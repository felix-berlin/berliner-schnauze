<template>
  <div class="c-quick-search">
    <!-- Enter without an active option sends the form: the full search page for the query. -->
    <form role="search" method="get" action="/wort">
      <SearchField
        ref="field"
        v-model="input"
        list="schnellsuche"
        :active-id="activeId"
        :expanded="rows.length > 0"
        @keydown="onKeydown"
      />
    </form>

    <p v-if="q && !loadError" class="meta" aria-live="polite">
      <template v-if="answered === undefined">Suche läuft …</template>
      <template v-else-if="total === 0">Keene Treffer für „<b>{{ answered }}</b>“</template>
      <template v-else><b>{{ formatCount(total) }}</b> Treffer für „{{ answered }}“</template>
    </p>

    <SearchLoadState v-if="loadError" :online="online" @retry="load" />

    <div ref="scroller" class="list">
      <Virtualizer
        v-if="scroller && rows.length"
        id="schnellsuche"
        ref="virtualizer"
        v-slot="{ item: row, index }"
        :data="rows"
        :scroll-ref="scroller"
        class="c-hit-list"
        role="listbox"
        aria-label="Treffer"
      >
        <div v-if="row.kind === 'divider'" role="presentation" class="divider">
          {{ row.label }}
        </div>
        <HitRow
          v-else-if="row.kind === 'hit'"
          :id="`schnellsuche-${row.hit.entry.slug}`"
          :hit="row.hit"
          :q="answered ?? ''"
          :active="index === activeIndex"
          :wotd="false"
          compact
        />
      </Virtualizer>
    </div>

    <!-- TODO(suche): Text bestätigen -->
    <a class="all" :href="searchUrl({ ...EMPTY_STATE, q })">Alle Treffer und Filter</a>
  </div>
</template>

<script setup lang="ts">
import type { ListRow } from "@lib/search/types";

import { useSearchIndex } from "@composables/useSearchIndex";
import { searchUrl } from "@composables/useSearchState";
import { useSearchTracking } from "@composables/useSearchTracking";
import { runSearch } from "@lib/search/run";
import { EMPTY_STATE } from "@lib/search/state";
import { reportError } from "@utils/reportError.ts";
import { refDebounced } from "@vueuse/core";
import { navigate } from "astro:transitions/client";
import { Virtualizer } from "virtua/vue";
import { computed, nextTick, onMounted, ref, shallowRef, useTemplateRef, watch } from "vue";

import HitRow from "./HitRow.vue";
import SearchField from "./SearchField.vue";
import SearchLoadState from "./SearchLoadState.vue";

const TYPE_DEBOUNCE = 150; // SPEC §5, same as the search page

const formatCount = (n: number) => n.toLocaleString("de");

const input = ref("");
const debounced = refDebounced(input, TYPE_DEBOUNCE);
const q = computed(() => debounced.value.trim());

// Same core as the search page, without filters, KI, trend or Wort des Tages.
const ctx = { trendRanks: new Map<string, number>() };
const rows = shallowRef<ListRow[]>([]);
const total = ref(0);
const answered = ref<string>(); // the query of the rows on screen: they stay until a newer answer is there

/* Index: single-flight with the search page; loading starts when the modal opens. */
const { index, load, loadError, online } = useSearchIndex(() => void run());
const track = useSearchTracking();

/* A newer run wins. */
let runId = 0;
async function run() {
  const id = ++runId;
  const query = q.value;
  activeIndex.value = -1;
  if (!query) {
    rows.value = [];
    answered.value = undefined;
    return;
  }
  const idx = index.value;
  if (!idx) return; // loading: the index runs the search once it is there
  try {
    const next = await runSearch(idx.db, idx.entries, { ...EMPTY_STATE, q: query }, ctx);
    if (id !== runId) return;
    rows.value = next.rows;
    total.value = next.total;
    answered.value = query;
    track(query, next.total);
  } catch (error) {
    if (id !== runId) return;
    reportError(error);
    loadError.value = true;
  }
}
watch(q, run);

/* Combobox (SPEC §12): focus stays in the field, ↑/↓ move the active option, Enter opens it. */
const field = useTemplateRef("field");
const scroller = useTemplateRef<HTMLElement>("scroller");
const virtualizer = useTemplateRef("virtualizer");
const activeIndex = ref(-1);
const activeId = ref<string>();
const hitIndices = computed(() => rows.value.flatMap((row, i) => (row.kind === "hit" ? [i] : [])));

async function move(delta: 1 | -1) {
  const hits = hitIndices.value;
  if (!hits.length) return;
  const at = hits.indexOf(activeIndex.value);
  const next =
    at < 0 ? (delta > 0 ? 0 : hits.length - 1) : (at + delta + hits.length) % hits.length;
  const i = hits[next]!;
  activeIndex.value = i;
  // The row may not be rendered yet: scroll first, point aria-activedescendant at it once it exists.
  virtualizer.value?.scrollToIndex(i, { align: "nearest" });
  await nextTick();
  const row = rows.value[i];
  if (row?.kind === "hit" && activeIndex.value === i)
    activeId.value = `schnellsuche-${row.hit.entry.slug}`;
}
watch(activeIndex, (i) => i < 0 && (activeId.value = undefined));

function onKeydown(e: KeyboardEvent) {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    void move(e.key === "ArrowDown" ? 1 : -1);
    return;
  }
  const row = rows.value[activeIndex.value];
  if (e.key === "Enter" && row?.kind === "hit") {
    e.preventDefault();
    void navigate(`/wort/${row.hit.entry.slug}`);
  }
}

onMounted(() => {
  field.value?.focus();
  void load();
});
</script>

<style lang="scss">
@use "@styles/components/hit-list";
@use "@styles/components/quick-search";
</style>
