<template>
  <button
    class="c-searchbar c-button c-button--outline"
    type="button"
    aria-label="Suche aktivieren"
    @click="clickCallback"
  >
    <SearchIcon class="c-searchbar__search-icon" />
    <span class="c-searchbar__label">Suche</span>
    <SquareSlash class="c-searchbar__slash-icon" />
  </button>
</template>

<script setup lang="ts">
import SearchIcon from "virtual:icons/lucide/search";
import SquareSlash from "virtual:icons/lucide/square-slash";

const { clickCallback } = defineProps({
  clickCallback: {
    type: Function,
    default: () => {},
  },
});
</script>
<style lang="scss">
@use "@styles/components/searchbar.scss";
</style>
