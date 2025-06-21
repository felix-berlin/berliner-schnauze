<template>
  <button
    class="c-searchbar c-button c-button--outline"
    type="button"
    aria-label="Suche aktivieren"
    @click="openSearchModal()"
  >
    <SearchIcon class="c-searchbar__search-icon" />
    <span class="c-searchbar__label">Suche</span>
    <kbd class="c-searchbar__slash-icon">/</kbd>
  </button>
</template>

<script setup lang="ts">
import { open } from "@stores/modal.ts";
import { trackEvent } from "@utils/analytics";
import { useMagicKeys, whenever } from "@vueuse/core";
import SearchIcon from "virtual:icons/lucide/search";
import { defineAsyncComponent } from "vue";

const openSearchModal = () => {
  open({
    props: {
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

const keys = useMagicKeys({
  onEventFired(e) {
    if (e.shiftKey && e.key === "/" && e.type === "keydown") e.preventDefault();
  },
  passive: false,
});

const shiftSlash = keys["Shift+/"];

whenever(shiftSlash, () => openSearchViaKeyboard());
</script>

<style lang="scss">
@use "@styles/components/searchbar.scss";
</style>
