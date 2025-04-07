<template>
  <button class="c-word-search-link" @click.prevent="scrollToWordSearch">
    Berliner Mundart durchsuchen
    <span class="c-word-search-link__icon-wrap" :class="searchLinkIconWrapClass">
      <MousePointerClick class="c-word-search-link__icon" width="30" height="30" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import MousePointerClick from "virtual:icons/lucide/mouse-pointer-click";
import { usePreferredReducedMotion } from "@vueuse/core";

const searchLinkIconWrapClass = ref("");
const preferredMotion = usePreferredReducedMotion();

const scrollToWordSearch = () => {
  const findSearchBar = (retries = 5) => {
    const searchBar = document.querySelector(".c-word-search__search-input");

    if (searchBar) {
      searchBar.scrollIntoView({ behavior: "smooth", block: "start" });
      searchBar.focus({ preventScroll: true });
    } else if (retries > 0) {
      setTimeout(() => findSearchBar(retries - 1), 100); // Retry after 100ms
    } else {
      console.error("Search bar element not found after multiple attempts.");
    }
  };

  findSearchBar();
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
