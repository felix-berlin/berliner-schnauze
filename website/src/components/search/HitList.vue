<template>
  <WindowVirtualizer
    id="treffer"
    ref="virtualizer"
    v-slot="{ item: row, index }"
    :data="rows"
    :ssr-count="ssrCount"
    :style="mounted ? undefined : SERVER_FLOW"
    class="c-hit-list"
    role="listbox"
    aria-label="Treffer"
    @scroll="onScroll"
  >
    <!-- Keyed roots: virtua keys its items by them, so a new result set remounts rows instead of patching
         hydrated server rows by index (that left a duplicate row behind). A heading is not allowed inside a
         listbox (aria-required-children): the letter keeps the h2 look, not the role. -->
    <div v-if="row.kind === 'letter'" :key="`l-${row.letter}`" role="presentation" class="letter">
      <h2 role="none">{{ row.letter }}</h2>
      <span>{{ row.count.toLocaleString("de") }} {{ row.count === 1 ? "Wort" : "Wörter" }}</span>
    </div>
    <div
      v-else-if="row.kind === 'divider'"
      :key="`d-${row.label}`"
      role="presentation"
      class="divider"
    >
      {{ row.label }}
    </div>
    <HitRow
      v-else
      :id="`treffer-${row.hit.entry.slug}`"
      :key="row.hit.entry.slug"
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

import { useMounted } from "@vueuse/core";
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

/**
 * Until mount (server HTML, before hydration, without JS) virtua renders its rows in flow but sizes the root
 * from its 40px estimate with `contain: size`, so the real rows spilled over the footer. A fallthrough style
 * wins over the root's own: let the rows give the height until virtua measures them.
 */
const SERVER_FLOW = { contain: "none", height: "auto" };
const mounted = useMounted();

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
