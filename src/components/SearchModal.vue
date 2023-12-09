<template>
  <button
    class="c-searchbar c-button c-button--outline"
    type="button"
    aria-label="Suche aktivieren"
    @click="openSearch"
  >
    <SearchIcon class="c-searchbar__search-icon" />
    <span class="c-searchbar__label">Suche</span>
    <SquareSlash class="c-searchbar__slash-icon" />
  </button>

  <Modal
    :uid="searchId"
    :open="searchVisible"
    position="top"
    :disable-scroll="true"
    @close="searchVisible = false"
  >
    <search>
      <SearchBar id="main-search" />
    </search>
  </Modal>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted } from "vue";
import Modal from "@components/Modal.vue";
import SearchBar from "@components/SearchBar.vue";
import SearchIcon from "virtual:icons/lucide/search";
import SquareSlash from "virtual:icons/lucide/square-slash";

const searchId = "main-search";
const searchVisible = ref(false);

/**
 * Open the search modal
 *
 * @return  {void}
 */
const openSearch = (): void => {
  searchVisible.value = true;
  focusSearch();
};

/**
 * Close the search modal
 *
 * @return  {void}
 */
const closeSearch = (): void => {
  searchVisible.value = false;
};

/**
 * Focus the search input
 *
 * @return  {void}
 */
const focusSearch = (): void => {
  nextTick(() => {
    const inputElement = document?.querySelector(`#${searchId} input`) as HTMLInputElement;
    inputElement?.focus();
  });
};

/**
 * Open the search modal via keyboard
 *
 * @param   {KeyboardEvent}  event  Keyboard event
 *
 * @return  {void}
 */
const openSearchViaKeyboard = (event: KeyboardEvent): void => {
  // If input or textarea is focused, do nothing
  if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA")
    return;

  if (event.key === "/" || event.key === ".") {
    event.preventDefault();
    openSearch();
    focusSearch();
  }
};

onMounted(() => {
  window.addEventListener("keydown", (event) => openSearchViaKeyboard(event));

  document.addEventListener("astro:after-swap", () => closeSearch());
});

onUnmounted(() => {
  window.removeEventListener("keydown", (event) => openSearchViaKeyboard(event));

  document.removeEventListener("astro:after-swap", () => closeSearch());
});
</script>

<style lang="scss">
@use "@styles/components/searchbar.scss";
@use "@styles/plugins/pagefind.scss";
</style>
