<template>
  <button class="c-word-search-link" @click.prevent="scrollToWordSearch">
    Berliner Mundart durchsuchen
    <span class="c-word-search-link__icon-wrap" :class="searchLinkIconWrapClass">
      <MousePointerClick class="c-word-search-link__icon" width="30" height="30" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { trackEvent } from "@utils/analytics";
import { useBreakpoints, usePreferredReducedMotion } from "@vueuse/core";
import MousePointerClick from "virtual:icons/lucide/mouse-pointer-click";
import { onMounted, ref } from "vue";

const searchLinkIconWrapClass = ref("");
const preferredMotion = usePreferredReducedMotion();
const breakpoints = useBreakpoints({
  fhd: 1920,
  lg: 1260,
  md: 1024,
  sm: 768,
  uhd: 2560,
  xlg: 1440,
  xs: 568,
  xxs: 375,
});

const largerThanSm = breakpoints.greater("sm");

const scrollToWordSearch = () => {
  const findSearchBar = (retries = 5) => {
    const searchBar = document.querySelector(".c-word-search__search-input");

    if (searchBar) {
      searchBar.scrollIntoView({ behavior: "smooth", block: "start" });

      if (largerThanSm.value) {
        searchBar.focus({ preventScroll: true });
      }
    } else if (retries > 0) {
      setTimeout(() => findSearchBar(retries - 1), 100); // Retry after 100ms
    } else {
      console.error("Search bar element not found after multiple attempts.");
    }
  };

  findSearchBar();
  trackEvent("Search", "Click Search Link", "Search Link Clicked");
};

const showClickEffect = () => {
  if (preferredMotion.value !== "no-preference") return;

  searchLinkIconWrapClass.value = "u-ripple";
  setTimeout(() => {
    searchLinkIconWrapClass.value = "";
  }, 2000);
};

onMounted(() => {
  showClickEffect();
});
</script>

<style lang="scss">
@use "@styles/components/_word-search-link.scss";
</style>
