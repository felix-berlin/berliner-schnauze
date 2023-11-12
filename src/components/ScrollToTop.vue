<template>
  <Transition v-once name="fade">
    <button
      v-show="isScrolled"
      v-tooltip="{
        content: tooltip,
        disabled: (tooltip?.length ? false : true) || hideTooltip,
        placement: 'auto',
        distance: 12,
      }"
      type="button"
      class="c-scroll-to-top c-button c-button--center-icon c-button--dashed-border"
      :aria-label="buttonAriaLabel"
      @click="scrollToTop"
    >
      <ChevronUp :size="24" class="c-to-top__icon u-ignore-click" />
    </button>
  </Transition>
</template>

<script setup lang="ts">
import { onBeforeMount, onBeforeUnmount, ref } from "vue";
import ChevronUp from "virtual:icons/lucide/chevron-up";

interface ScrollToTopProps {
  buttonAriaLabel?: string;
  tooltip?: string;
  hideTooltip?: boolean;
}

const {
  showAtPosition = 500,
  buttonAriaLabel,
  tooltip,
  hideTooltip = false,
} = defineProps<ScrollToTopProps>();

const observer = ref<IntersectionObserver | null>(null);
const isScrolled = ref(false);

const handleIntersect = (entries: IntersectionObserverEntry[]) => {
  for (const entry in entries) {
    isScrolled.value = !entries[0].isIntersecting;
  }
};

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

onBeforeMount(() => {
  observer.value = new IntersectionObserver(handleIntersect);
  const body = document.querySelector("body");
  if (body) {
    observer.value.observe(body);
  }
});

onBeforeUnmount(() => {
  observer.value?.disconnect();
});
</script>

<style lang="scss">
@use "@styles/components/_scroll-to-top.scss";
</style>
