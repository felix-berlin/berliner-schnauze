<template>
  <QuickSearch />

  <footer>
    <template v-if="hasKeyboard">
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
    </template>
    <ModalCloseButton>
      <template #suffix>schließen</template>
    </ModalCloseButton>
  </footer>
</template>

<script setup lang="ts">
import ModalCloseButton from "@components/ModalCloseButton.vue";
import QuickSearch from "@components/search/QuickSearch.vue";
import { close } from "@stores/modal.ts";
import { useEventListener, useMediaQuery } from "@vueuse/core";
import ArrowDownIcon from "virtual:icons/lucide/arrow-down";
import ArrowUpIcon from "virtual:icons/lucide/arrow-up";
import CornerDownLeftIcon from "virtual:icons/lucide/corner-down-left";

// Coarse pointer (touch) implies no keyboard is the primary input; the shortcut
// hints below are meaningless without one. Reactive so a paired Bluetooth keyboard
// can still bring the hints back mid-session.
const hasKeyboard = useMediaQuery("(pointer: fine)");

// The modal island is not persisted: a hit or the /wort link navigates, the open dialog must not survive the swap.
useEventListener(document, "astro:before-swap", close);
</script>

<style lang="scss">
@use "@styles/components/shortcut";
@use "@styles/components/modals/search-modal";
</style>
