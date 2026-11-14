<template>
  <button
    class="c-searchbar c-button c-header-control"
    type="button"
    aria-label="Suche aktivieren"
    @click="openSearchModal()"
  >
    <SearchIcon />
    <span class="c-searchbar__label">Suche</span>
    <kbd class="c-searchbar__slash-icon">/</kbd>
  </button>
</template>

<script setup lang="ts">
import { open } from "@stores/modal.ts";
import { trackEvent } from "@utils/analytics";
import { isEditableTarget } from "@utils/helpers.ts";
import { onKeyStroke } from "@vueuse/core";
import SearchIcon from "virtual:icons/lucide/search";
import { defineAsyncComponent } from "vue";

const openSearchModal = () => {
  open({
    props: {
      ariaLabel: "Wörter suchen",
      class: "c-modal--search",
      showCloseButton: false,
    },
    view: {
      component: defineAsyncComponent(() => import("@components/modals/search/SearchModal.vue")),
    },
  });
};

/**
 * Open the search modal via keyboard
 *
 * @return  {void}
 */
const openSearchViaKeyboard = (): void => {
  openSearchModal();

  trackEvent("Search", "Open Search Modal via Keyboard", "Search Modal Opened via Keyboard");
};

// "/" is Shift+7 on a German keyboard: any key event that types "/" counts, but never inside a field.
onKeyStroke("/", (e) => {
  if (e.repeat || isEditableTarget(e.target)) return;
  e.preventDefault();
  openSearchViaKeyboard();
});
</script>

<style lang="scss">
@use "@styles/components/searchbar";
</style>
