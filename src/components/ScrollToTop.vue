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
import { trackEvent } from "@utils/analytics";
import ChevronUp from "virtual:icons/lucide/chevron-up";
import { onBeforeUnmount, onMounted, ref } from "vue";

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

const observer = ref<IntersectionObserver | null>(null);
const isScrolled = ref(false);

const handleIntersect = ([entry]: IntersectionObserverEntry[]) => {
  isScrolled.value = !entry.isIntersecting;
};

const scrollToTop = () => {
  window.scrollTo({ behavior: "smooth", top: 0 });
  trackEvent("Scroll to Top", "Clicked", "Scroll to Top Button");
};

onMounted(() => {
  observer.value = new IntersectionObserver(handleIntersect, {
    rootMargin: `${showAtPosition}px 0px 0px 0px`,
  });

  const body = document.querySelector("#docStart");

  const footerElement = document.querySelector(".c-footer__ground");

  if (footerElement) {
    observer.value.observe(footerElement);
  }

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
