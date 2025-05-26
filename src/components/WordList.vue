<template>
  <WindowVirtualizer
    ref="virtualizerRef"
    v-slot="{ item, index }"
    :data="mutableOramaSearch"
    class="c-word-list"
    aria-live="polite"
    role="list"
  >
    <SingleWord
      :ref="setResultRef"
      :key="index"
      :index="index"
      :source="item"
      :style="{ 'margin-bottom': '1.75rem' }"
      :class="{ 'is-active': showActive && index === activeIndex }"
      role="listitem"
      tabindex="0"
      :show-dropdown="showDropdown"
      @click.prevent="goToWord(item.slug!)"
    />
  </WindowVirtualizer>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, watchEffect, useTemplateRef } from "vue";
import SingleWord from "@components/word/SingleWord.vue";
import { useStore } from "@nanostores/vue";
import { $oramaSearchResults } from "@stores/index.ts";
import { WindowVirtualizer } from "virtua/vue";
import { routeToWord } from "@utils/helpers.ts";
import { onKeyStroke } from "@vueuse/core";
import type { ComponentPublicInstance } from "vue";

const { showDropdown = true } = defineProps<{
  useWindowVirtualizer?: boolean;
  showDropdown?: boolean;
  scrollRef?: string;
}>();

const oramaSearch = useStore($oramaSearchResults);
const mutableOramaSearch = computed(
  () => oramaSearch.value?.hits?.map((hit) => hit.document) ?? [],
);

const activeIndex = ref(0);
const resultRefs = ref<HTMLElement[]>([]);
const virtualizerRef = useTemplateRef("virtualizerRef");
const showActive = ref(false);
let hideActiveTimeout: ReturnType<typeof setTimeout> | null = null;
const ACTIVE_TIMEOUT = 1500; // ms

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

const setResultRef = (el: Element | ComponentPublicInstance | null) => {
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
      // el.scrollIntoView({ block: "nearest", behavior: "smooth" });
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
  const slug = mutableOramaSearch.value[activeIndex.value]?.slug;
  if (slug) goToWord(slug);
  e.preventDefault();
});
</script>

<style lang="scss">
@use "@styles/components/word-list";
</style>
