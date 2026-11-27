<template>
  <WindowVirtualizer
    id="treffer"
    ref="virtualizer"
    v-slot="{ item: row, index }"
    :data="rows"
    :ssr-count="ssrCount"
    class="c-hit-list"
    role="listbox"
    aria-label="Treffer"
    @scroll="onScroll"
  >
    <div v-if="row.kind === 'letter'" role="presentation" class="letter">
      <h2>{{ row.letter }}</h2>
      <span>{{ row.count.toLocaleString("de") }} Wörter</span>
    </div>
    <div v-else-if="row.kind === 'divider'" role="presentation" class="divider">
      {{ row.label }}
    </div>
    <HitRow
      v-else
      :id="`treffer-${row.hit.entry.slug}`"
      :hit="row.hit"
      :q="q"
      :active="index === activeIndex"
      :wotd="row.hit.entry.slug === wotd"
      :trend-rank="trendRanks.get(row.hit.entry.slug)"
      :scope="scope"
    />
  </WindowVirtualizer>
</template>

<script setup lang="ts">
import type { SearchState } from "@lib/search/state";
import type { ListRow } from "@lib/search/types";

import { WindowVirtualizer } from "virtua/vue";
import { useTemplateRef } from "vue";

import HitRow from "./HitRow.vue";

defineProps<{
  rows: ListRow[];
  q: string;
  activeIndex: number;
  wotd?: string;
  trendRanks: Map<string, number>;
  scope: Pick<SearchState, "area" | "age">;
  /** Rows rendered on the server (and kept until hydration). */
  ssrCount: number;
}>();
const emit = defineEmits<{ top: [index: number] }>();

const virtualizer = useTemplateRef("virtualizer");

/** First row at the top of the viewport, for the register's scroll-spy. */
const onScroll = () => {
  const v = virtualizer.value;
  if (v) emit("top", v.findItemIndex(v.scrollOffset));
};

defineExpose({
  scrollToIndex: (index: number, opts: { align?: "start" | "nearest" } = { align: "nearest" }) =>
    virtualizer.value?.scrollToIndex(index, opts),
});
</script>

<style lang="scss">
@use "@styles/components/hit-list";
</style>
