<template>
  <component
    :is="virtualizerComponent"
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
      :ref="setResultRef"
      :key="index"
      :index="index"
      :source="item.document"
      :positions="item.positions"
      :style="{ 'margin-bottom': singleWordGap }"
      :class="{ 'is-active': showActive && index === activeIndex }"
      tabindex="0"
      :show-dropdown="showDropdown"
    />
  </component>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from "vue";

import SingleWord from "@components/word/SingleWord.vue";
import { useStore } from "@nanostores/vue";
import { $oramaSearchResults } from "@stores/wordList.ts";
import { routeToWord } from "@utils/helpers.ts";
import { onKeyStroke, useTimeoutFn } from "@vueuse/core";
import { VList, WindowVirtualizer } from "virtua/vue";
import { computed, nextTick, ref, useTemplateRef, watch } from "vue";
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
const mutableOramaSearch = computed(
  () =>
    (oramaSearch.value?.state === "ready" ? (oramaSearch.value.value?.hits ?? []) : []) as unknown as {
      document: OramaSearchIndex;
      id: string;
      positions: Record<string, Record<string, { length: number; start: number }[]>>;
      score: number;
    }[],
);

const activeIndex = ref(0);
const resultRefs = ref<HTMLElement[]>([]);
const virtualizerRef = useTemplateRef("virtualizer");
const showActive = ref(false);
const ACTIVE_TIMEOUT = 3500; // ms

const { start: startHideActiveTimer } = useTimeoutFn(() => {
  showActive.value = false;
}, ACTIVE_TIMEOUT, { immediate: false });

const showActiveWithTimeout = () => {
  showActive.value = true;
  startHideActiveTimer();
};

// Clear refs when result data changes, not on every render side effect.
watch(mutableOramaSearch, () => {
  resultRefs.value = [];
});

const setResultRef = (el: ComponentPublicInstance | Element | null) => {
  if (el instanceof HTMLElement) resultRefs.value.push(el);
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
    const el = resultRefs.value[activeIndex.value];
    if (el && typeof el.focus === "function") {
      el.focus();
    }
  });
};

onKeyStroke("ArrowDown", (e) => {
  if (!mutableOramaSearch.value.length) return;
  showActiveWithTimeout();
  activeIndex.value = (activeIndex.value + 1) % mutableOramaSearch.value.length;
  focusActive();
  e.preventDefault();
});

onKeyStroke("ArrowUp", (e) => {
  if (!mutableOramaSearch.value.length) return;
  showActiveWithTimeout();
  activeIndex.value =
    (activeIndex.value - 1 + mutableOramaSearch.value.length) % mutableOramaSearch.value.length;
  focusActive();
  e.preventDefault();
});

onKeyStroke("Enter", (e) => {
  if (!mutableOramaSearch.value.length) return;
  const slug = mutableOramaSearch.value[activeIndex.value].document?.slug;

  if (slug) goToWord(slug);
  e.preventDefault();
});
</script>

<style lang="scss">
@use "@styles/components/word-list";
</style>
