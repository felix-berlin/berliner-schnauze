<template>
  <SearchBarModal :click-callback="getModalLoaded"></SearchBarModal>
  <Modal
    v-if="loadModal"
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
import { ref, defineAsyncComponent } from "vue";
import type { Ref } from "vue";
import { trackEvent } from "@utils/analytics";
import SearchBarModal from "@components/SearchBarModal.vue";
import { useMagicKeys, whenever } from "@vueuse/core";

const Modal = defineAsyncComponent(() => import("@components/Modal.vue"));
const SearchBar = defineAsyncComponent(() => import("@components/SearchBar.vue"));

const loadModal = ref(false);
const modalMounted = ref(false);
const searchVisible = ref(false);

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

const keys = useMagicKeys();
const shiftSlash = keys["Shift+/"];
whenever(shiftSlash, () => openSearchViaKeyboard());
</script>

<style lang="scss">
@use "@styles/plugins/pagefind.scss";
</style>
