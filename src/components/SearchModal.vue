<template>
  <button
    class="c-searchbar c-button c-button--outline"
    type="button"
    aria-label="Suche aktivieren"
    @click="getModalLoaded"
  >
    <SearchIcon class="c-searchbar__search-icon" />
    <span class="c-searchbar__label">Suche</span>
    <SquareSlash class="c-searchbar__slash-icon" />
  </button>

  <Modal
    v-if="loadModal"
    ref="searchModal"
    :open="searchVisible"
    position="top"
    :disable-scroll="true"
    @close="searchVisible = false"
    @mounted="modalMounted = true"
  >
    <!-- TODO: replace by <search></search>  -->
    <div role="search">
      <SearchBar id="main-search" />
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted, defineAsyncComponent, watch } from "vue";
import type { Ref } from "vue";
import SearchIcon from "virtual:icons/lucide/search";
import SquareSlash from "virtual:icons/lucide/square-slash";

const Modal = defineAsyncComponent(() => import("@components/Modal.vue"));

const SearchBar = defineAsyncComponent(() => import("@components/SearchBar.vue"));

const loadModal = ref(false);
const modalMounted = ref(false);
const searchVisible = ref(false);
const searchModal: Ref<InstanceType<typeof Modal> | null> = ref(null);

/**
 * Trigger the async modal to load
 *
 * @return  {void}
 */
const getModalLoaded = (): void => {
  loadModal.value = true;
};

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
    // Get the root DOM element of the component
    const rootElement = searchModal.value?.$el;

    // Find the <input> element within the component
    const inputElement = rootElement?.querySelector("input");

    // Focus the <input> element
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
    getModalLoaded();
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

/**
 * Watch if modal is mounted
 * If true, open the search
 */
watch(modalMounted, (value) => {
  if (value) {
    openSearch();
  }
});
</script>

<style lang="scss">
@use "@styles/components/searchbar.scss";
@use "@styles/plugins/pagefind.scss";
</style>
