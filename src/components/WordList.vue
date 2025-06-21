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
import { $oramaSearchResults } from "@stores/index.ts";
import { routeToWord } from "@utils/helpers.ts";
import { onKeyStroke } from "@vueuse/core";
import { VList, WindowVirtualizer } from "virtua/vue";
import { computed, nextTick, ref, useTemplateRef, watchEffect } from "vue";

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
const mutableOramaSearch = computed(() => oramaSearch.value?.hits?.map((hit) => hit) ?? []);

const activeIndex = ref(0);
const resultRefs = ref<HTMLElement[]>([]);
const virtualizerRef = useTemplateRef("virtualizer");
const showActive = ref(false);
let hideActiveTimeout: null | ReturnType<typeof setTimeout> = null;
const ACTIVE_TIMEOUT = 3500; // ms

const showActiveWithTimeout = () => {
  showActive.value = true;
  if (hideActiveTimeout) clearTimeout(hideActiveTimeout);
  hideActiveTimeout = setTimeout(() => {
    showActive.value = false;
  }, ACTIVE_TIMEOUT);
};

// Always clear refs array before each render cycle
watchEffect(() => {
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
    behavior: "smooth",
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
