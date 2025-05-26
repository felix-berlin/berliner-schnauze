<template>
  <SearchBarModal :click-callback="getModalLoaded"></SearchBarModal>
  <Modal
    v-if="loadModal"
    :open="searchVisible"
    position="top"
    :disable-scroll="true"
    :show-close-button="false"
    class="has-hidden-overflow c-modal--search"
    @close="searchVisible = false"
    @mounted="modalMounted = true"
    @open="searchWords?.focusSearchInput()"
  >
    <!-- TODO: replace by <search></search>  -->
    <div role="search" class="c-search-container">
      <!-- <SearchBar id="main-search" /> -->
      <SearchWords ref="searchWords" :init-focus="true" />

      <p class="c-word-search-list__result-count">
        {{ searchResultCount }} {{ searchResultCount === 1 ? "Ergebnis" : "Ergebnisse" }}
      </p>

      <WordList :show-dropdown="false" :use-window-virtualizer="false" />
    </div>

    <footer>
      <span class="c-shortcut">
        <kbd><CornerDownLeftIcon aria-label="Enter Taste" class="c-shortcut__key" /></kbd>
        <span class="c-shortcut__text">zum auswählen</span>
      </span>
      <span class="c-shortcut">
        <kbd><ArrowUpIcon aria-label="Pfeil oben Taste" class="c-shortcut__key" /></kbd>
        <kbd><ArrowDownIcon aria-label="Pfeil unten Taste" class="c-shortcut__key" /></kbd>
        <span class="c-shortcut__text">zum navigieren</span>
      </span>
      <span class="c-shortcut">
        <kbd class="c-shortcut__key">ESC</kbd>
        <span class="c-shortcut__text">zum schließen</span>
      </span>
    </footer>
  </Modal>
</template>

<script setup lang="ts">
import { ref, defineAsyncComponent, useTemplateRef } from "vue";
import { trackEvent } from "@utils/analytics";
import SearchBarModal from "@components/SearchBarModal.vue";
import { useMagicKeys, whenever } from "@vueuse/core";
import ArrowUpIcon from "virtual:icons/lucide/arrow-up";
import ArrowDownIcon from "virtual:icons/lucide/arrow-down";
import CornerDownLeftIcon from "virtual:icons/lucide/corner-down-left";
import { $searchResultCount } from "@stores/index";
import { useStore } from "@nanostores/vue";

const Modal = defineAsyncComponent(() => import("@components/Modal.vue"));
const SearchWords = defineAsyncComponent(() => import("@components/SearchWords.vue"));
const WordList = defineAsyncComponent(() => import("@components/WordList.vue"));

const loadModal = ref(false);
const modalMounted = ref(false);
const searchVisible = ref(false);

const searchWords = useTemplateRef("searchWords");

const searchResultCount = useStore($searchResultCount);

/**
 * This function is responsible for loading and displaying the modal.
 * If the modal is already mounted, it will be displayed immediately.
 * If the modal is not yet mounted, it will trigger the loading of the modal.
 * It will then keep retrying to display the modal every 100ms until the modal is mounted.
 *
 * @return  {void}
 */
const getModalLoaded = (): void => {
  // If the modal is already mounted, display it immediately
  if (modalMounted.value) {
    searchVisible.value = true;
  } else {
    // If the modal is not yet loading, trigger the loading of the modal
    if (!loadModal.value) {
      loadModal.value = true;
    }
    // Retry to display the modal every 100ms until it is mounted
    setTimeout(getModalLoaded, 100);
  }

  trackEvent("Search", "Open Search Modal", "Search Modal Opened");
};

/**
 * Open the search modal via keyboard
 *
 * @return  {void}
 */
const openSearchViaKeyboard = (): void => {
  getModalLoaded();

  trackEvent("Search", "Open Search Modal via Keyboard", "Search Modal Opened via Keyboard");
};

const keys = useMagicKeys({
  passive: false,
  onEventFired(e) {
    if (e.shiftKey && e.key === "/" && e.type === "keydown") e.preventDefault();
  },
});
const shiftSlash = keys["Shift+/"];
whenever(shiftSlash, () => openSearchViaKeyboard());
</script>

<style lang="scss">
@use "@styles/components/shortcut";
</style>
