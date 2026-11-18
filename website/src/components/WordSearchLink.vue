<template>
  <a class="c-word-search-link" href="/suche" @click="onClick">
    Berliner Mundart durchsuchen
    <span class="c-word-search-link__icon-wrap" :class="searchLinkIconWrapClass">
      <MousePointerClick class="c-word-search-link__icon" width="30" height="30" />
    </span>
  </a>
</template>

<script setup lang="ts">
import { trackEvent } from "@utils/analytics";
import { usePreferredReducedMotion } from "@vueuse/core";
import MousePointerClick from "virtual:icons/lucide/mouse-pointer-click";
import { onMounted, ref } from "vue";

const searchLinkIconWrapClass = ref("");
const preferredMotion = usePreferredReducedMotion();

const onClick = () => {
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
@use "@styles/components/word-search-link";
</style>
