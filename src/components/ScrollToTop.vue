<template>
  <Transition name="fade">
    <button
      v-show="isScrolled"
      v-tooltip="{
        content: tooltip,
        disabled: (tooltip?.length ? false : true) || hideTooltip,
        offset: 12,
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
import { trackEvent } from "@utils/analytics";
import ChevronUp from "virtual:icons/lucide/chevron-up";
import { useIntersectionObserver } from "@vueuse/core";
import { onMounted, ref } from "vue";

interface ScrollToTopProps {
  buttonAriaLabel?: string;
  hideTooltip?: boolean;
  showAtPosition?: number;
  tooltip?: string;
}

const {
  buttonAriaLabel = "nach oben scrollen",
  hideTooltip = false,
  showAtPosition = 500,
  tooltip = "",
} = defineProps<ScrollToTopProps>();

const isScrolled = ref(false);

const scrollToTop = () => {
  window.scrollTo({ behavior: "smooth", top: 0 });
  trackEvent("Scroll to Top", "Clicked", "Scroll to Top Button");
};

const docStart = ref<HTMLElement | null>(null);
const footerGround = ref<HTMLElement | null>(null);

onMounted(() => {
  docStart.value = document.querySelector<HTMLElement>("#docStart");
  footerGround.value = document.querySelector<HTMLElement>(".c-footer__ground");
});

useIntersectionObserver(
  [docStart, footerGround],
  ([entry]) => { isScrolled.value = !entry.isIntersecting; },
  { rootMargin: `${showAtPosition}px 0px 0px 0px` },
);
</script>

<style lang="scss">
@use "@styles/components/scroll-to-top";
</style>
