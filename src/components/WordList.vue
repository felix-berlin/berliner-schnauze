<template>
  <WordListSkeleton v-if="searchState === 'loading'" :item-size="itemSize" />

  <div v-else-if="searchState === 'failed'" class="c-word-search-list__no-result" role="alert">
    <p>Da klemmt wat. Lad de Seite neu.</p>
  </div>

  <component
    :is="virtualizerComponent"
    v-else
    ref="virtualizer"
    v-slot="{ item, index }"
    v-bind="!useWindowVirtualizer ? { style: { width: '100%', height: '100%' } } : {}"
    :data="mutableOramaSearch"
    :item-size="itemSize"
    class="c-word-list"
    aria-live="polite"
    as="ul"
    item="li"
  >
    <SingleWord
      :key="index"
      :index="index"
      :source="item.document"
      :highlight-term="searchQuery"
      :style="{ 'margin-bottom': singleWordGap }"
      :class="{ 'is-active': showActive && index === activeIndex }"
      tabindex="0"
      :show-dropdown="showDropdown"
    />
  </component>
</template>

<script setup lang="ts">
import WordListSkeleton from "@components/word-search/WordListSkeleton.vue";
import SingleWord from "@components/word/SingleWord.vue";
import { useStore } from "@nanostores/vue";
import { $oramaSearchResults, $searchQuery, $searchState } from "@stores/wordList.ts";
import { routeToWord } from "@utils/helpers.ts";
import { onKeyStroke, useTimeoutFn } from "@vueuse/core";
import { VList, WindowVirtualizer } from "virtua/vue";
import { computed, nextTick, ref, useTemplateRef } from "vue";

import type { OramaSearchIndex } from "@/pages/api/search/index.json";

const {
  itemSize = 110,
  showDropdown = true,
  singleWordGap = "1.75rem",
  useWindowVirtualizer = true,
} = defineProps<{
  itemSize?: number;
  showDropdown?: boolean;
  singleWordGap?: string;
  useWindowVirtualizer?: boolean;
}>();

const virtualizerComponent = useWindowVirtualizer ? WindowVirtualizer : VList;

const oramaSearch = useStore($oramaSearchResults);
const searchQuery = useStore($searchQuery);
const searchState = useStore($searchState);
const mutableOramaSearch = computed(
  () =>
    (oramaSearch.value?.state === "ready"
      ? (oramaSearch.value.value?.hits ?? [])
      : []) as unknown as {
      document: OramaSearchIndex;
      id: string;
      score: number;
    }[],
);

const activeIndex = ref(0);
const virtualizerRef = useTemplateRef("virtualizer");
const showActive = ref(false);
const ACTIVE_TIMEOUT = 3500; // ms

const { start: startHideActiveTimer } = useTimeoutFn(
  () => {
    showActive.value = false;
  },
  ACTIVE_TIMEOUT,
  { immediate: false },
);

const showActiveWithTimeout = () => {
  showActive.value = true;
  startHideActiveTimer();
};

const goToWord = (slug: string) => {
  window.location.href = routeToWord(slug);
};

const focusActive = () => {
  // 1. Scroll the virtualizer to the active index
  virtualizerRef.value?.scrollToIndex?.(activeIndex.value, {
    align: "center",
    smooth: true,
  });

  // 2. Wait for DOM update, then focus and scroll the element
  void nextTick(() => {
    // The list is virtualized, so look the rendered item up by its element id.
    const wordId = mutableOramaSearch.value[activeIndex.value]?.document?.berlinerWordId;
    if (wordId !== undefined) {
      document.getElementById(`word-${wordId}`)?.focus({ preventScroll: true });
    }
  });
};

const move = (delta: number) => (e: KeyboardEvent) => {
  const { length } = mutableOramaSearch.value;
  if (!length) return;
  showActiveWithTimeout();
  activeIndex.value = (activeIndex.value + delta + length) % length;
  focusActive();
  e.preventDefault();
};

onKeyStroke("ArrowDown", move(1));
onKeyStroke("ArrowUp", move(-1));

onKeyStroke("Enter", (e) => {
  if (!mutableOramaSearch.value.length) return;
  // Buttons/links (e.g. the options dropdown trigger) handle Enter themselves.
  if (e.target instanceof Element && e.target.closest("button, a")) return;
  const slug = mutableOramaSearch.value[activeIndex.value].document?.slug;

  if (slug) goToWord(slug);
  e.preventDefault();
});
</script>

<style lang="scss">
@use "@styles/components/word-list";
</style>
