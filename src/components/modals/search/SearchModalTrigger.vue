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
import { defineAsyncComponent } from "vue";
import SearchIcon from "virtual:icons/lucide/search";
import { open } from "@stores/modal.ts";
import { useMagicKeys, whenever } from "@vueuse/core";
import { trackEvent } from "@utils/analytics";

const openSearchModal = () => {
  open({
    view: {
      component: defineAsyncComponent(() => import("@components/modals/search/SearchModal.vue")),
    },
    props: {
      class: "has-hidden-overflow c-modal--search",
      showCloseButton: false,
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
  passive: false,
  onEventFired(e) {
    if (e.shiftKey && e.key === "/" && e.type === "keydown") e.preventDefault();
  },
});

const shiftSlash = keys["Shift+/"];

whenever(shiftSlash, () => openSearchViaKeyboard());
</script>

<style lang="scss">
@use "@styles/components/searchbar.scss";
</style>
