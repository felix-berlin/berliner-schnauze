<template>
  <Transition name="fade">
    <button
      v-show="isScrolled"
      v-tooltip="{
        content: tooltip,
        disabled: (tooltip?.length ? false : true) || hideTooltip,
        placement: 'auto',
        distance: 12,
      }"
      type="button"
      class="c-scroll-to-top c-button c-button--center-icon"
      :aria-label="buttonAriaLabel"
      @click="scrollToTop"
    >
      <ChevronUp :width="24" :height="24" class="c-to-top__icon u-ignore-click" />
    </button>
  </Transition>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
import ChevronUp from "virtual:icons/lucide/chevron-up";

interface ScrollToTopProps {
  showAtPosition?: number;
  buttonAriaLabel?: string;
  tooltip?: string;
  hideTooltip?: boolean;
}

const {
  showAtPosition = 500,
  buttonAriaLabel = "nach oben scrollen",
  tooltip,
  hideTooltip = false,
} = defineProps<ScrollToTopProps>();

const observer = ref<IntersectionObserver | null>(null);
const isScrolled = ref(false);

const handleIntersect = ([entry]: IntersectionObserverEntry[]) => {
  isScrolled.value = !entry.isIntersecting;
};

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

onMounted(() => {
  observer.value = new IntersectionObserver(handleIntersect, {
    rootMargin: `${showAtPosition}px 0px 0px 0px`,
  });

  const body = document.querySelector("#docStart");

  if (body) {
    observer.value.observe(body);
  }
});

onBeforeUnmount(() => {
  observer.value?.disconnect();
});
</script>

<style lang="scss">
@use "@styles/components/scroll-to-top.scss";
</style>
