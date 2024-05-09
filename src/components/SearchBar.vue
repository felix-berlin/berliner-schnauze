<template>
  <div
    :id="id"
    class="c-search"
  />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { PagefindUI } from "@pagefind/default-ui";

export interface SearchBarProps {
  id: string;
}

const props = defineProps<SearchBarProps>();

let bundlePath = `${import.meta.env.BASE_URL}pagefind/`;

if (import.meta.env.DEV) {
  bundlePath = "/dist/pagefind/";
  console.warn(
    "If there are no search results, make sure you have run `npm run build` and that the `dist/pagefind` folder exists.",
  );
}

/**
 * Initialize Pagefind
 *
 * @return  {void}
 */
const initPagefind = (): void => {
  new PagefindUI({
    element: `#${props.id}`,
    baseUrl: "/",
    resetStyles: false,
    showImages: false,
    autofocus: true,
    excerptLength: 15,
    bundlePath,
  });
};

/**
 * Trigger search via keyboard
 *
 * @param   {KeyboardEvent}  event
 *
 * @return  {void}
 */
const triggerSearchViaKeyboard = (event: KeyboardEvent): void => {
  const activeElement = document.activeElement?.tagName;
  // If input or textarea is focused, do nothing
  if (activeElement === "INPUT" || activeElement === "TEXTAREA") return;

  if (event.key === "/" || event.key === ".") {
    event.preventDefault();
    const inputElement = document?.querySelector(`#${props.id} input`) as HTMLElement;
    inputElement?.focus();
  }
};

onMounted(() => {
  initPagefind();

  window.addEventListener("keydown", (event) => triggerSearchViaKeyboard(event));
});

onUnmounted(() => {
  window.removeEventListener("keydown", (event) => triggerSearchViaKeyboard(event));
});
</script>

<style lang="scss">
@use "@styles/components/search.scss";
@use "@pagefind/default-ui/css/ui.css";
</style>
