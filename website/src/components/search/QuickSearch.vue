<template>
  <!-- TODO(schnellsuche): SPEC §26.2 open: on phones the header button opens the full-screen dialog (as in the mock), not the search page. -->
  <button
    ref="trigger"
    class="c-searchbar c-button c-header-control"
    type="button"
    aria-label="Suche aktivieren"
    aria-haspopup="dialog"
    @click="open"
  >
    <IconSearch aria-hidden="true" />
    <span class="c-searchbar__label">Suche</span>
    <kbd class="c-searchbar__slash-icon">/</kbd>
  </button>

  <!-- Native modal (SPEC §19): the page behind is inert, Esc closes. The dialog covers the viewport and paints
       the scrim itself, so a press outside the box lands on it; .box is the visible dialog. -->
  <dialog
    ref="dialog"
    class="c-quick-search"
    aria-label="Schnellsuche"
    :data-variant="wide ? undefined : 'mobile'"
    @close="onClose"
    @keydown="trapTab"
    @pointerdown="pressedOutside = $event.target === dialog"
    @click="pressedOutside && $event.target === dialog && close()"
  >
    <QuickSearchPanel v-if="loaded" :open="isOpen" :wide @close="close" />
  </dialog>
</template>

<script setup lang="ts">
import { trackEvent } from "@utils/analytics";
import { isEditableTarget } from "@utils/helpers.ts";
import { defaultDocument, useEventListener, useMediaQuery } from "@vueuse/core";
import { defineAsyncComponent, ref, useTemplateRef } from "vue";

/** Header quick search: trigger, the global keys and the dialog shell (SPEC §19, §20, §27). */
const QuickSearchPanel = defineAsyncComponent(
  () => import("@components/search/QuickSearchPanel.vue"),
);
const IconSearch = defineAsyncComponent(() => import("virtual:icons/lucide/search"));

const dialog = useTemplateRef<HTMLDialogElement>("dialog");
const trigger = useTemplateRef<HTMLButtonElement>("trigger");
const wide = useMediaQuery("(min-width: 808px)"); // SPEC §20: full screen below 808px
const loaded = ref(false); // the panel (index, search core) loads on the first open only
const isOpen = ref(false);
const pressedOutside = ref(false);
let opener: HTMLElement | null = null;

function open() {
  const d = dialog.value;
  if (!d || d.open) return;
  const at = document.activeElement;
  opener = at instanceof HTMLElement && at !== document.body ? at : trigger.value;
  loaded.value = true;
  isOpen.value = true;
  d.showModal();
}

const close = () => dialog.value?.close();

function onClose() {
  isOpen.value = false;
  opener?.focus();
  opener = null;
}

/* Chrome lets Tab leave a modal dialog for the browser UI: wrap it at both ends (SPEC §23 Tab cycle). */
function trapTab(e: KeyboardEvent) {
  if (e.key !== "Tab" || !dialog.value) return;
  const items = [...dialog.value.querySelectorAll<HTMLElement>("input, button, a[href]")].filter(
    (el) => el.tabIndex >= 0 && !el.closest("[hidden]"),
  );
  const first = items[0];
  const last = items.at(-1);
  if (!first || !last) return;
  const at = document.activeElement;
  if (e.shiftKey ? at === first : at === last) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
  }
}

// One global listener on window (SSR-safe default target; the header is persisted). Pages with their own big field (/wort, start page) take "/"
// in a window capture listener and stop it, so it never reaches this one.
useEventListener("keydown", (e: KeyboardEvent) => {
  if (e.repeat || dialog.value?.open) return;
  const ctrlK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k";
  if (!ctrlK && (e.key !== "/" || isEditableTarget(e.target))) return;
  e.preventDefault();
  open();
  trackEvent("Search", "Open Search Modal via Keyboard", "Search Modal Opened via Keyboard");
});

// A link in the dialog (Meinste, footer) swaps the page under the persisted header: close first.
useEventListener(defaultDocument, "astro:before-swap", close);
</script>

<style lang="scss">
@use "@styles/components/searchbar";
@use "@styles/components/quick-search";
</style>
