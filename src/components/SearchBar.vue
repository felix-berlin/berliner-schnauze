<template>
  <div :id="id" class="c-search" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, nextTick } from "vue";
import { PagefindUI } from "@pagefind/default-ui";
import { setMatomoSearch } from "@stores/index";
import { useDebounceFn } from "@vueuse/core";

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

const searchInputValue = ref("");

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

const trackWordSearchListSearch = (search: string) => {
  setMatomoSearch(search, "Word Page Search");
};

const debouncedTrackSearch = useDebounceFn(trackWordSearchListSearch, 1000, { maxWait: 5000 });

/**
 * Watch the input element for changes
 */
const watchSearchInput = () => {
  const inputElement = document.querySelector(
    `#${props.id} .pagefind-ui__search-input`,
  ) as HTMLInputElement;

  if (inputElement) {
    inputElement.addEventListener("input", () => {
      searchInputValue.value = inputElement.value;

      debouncedTrackSearch(searchInputValue.value).catch((error) => {
        console.error("Error in debouncedTrackSearch:", error);
      });
    });
  } else {
    console.warn("Search input element not found.");
  }
};

onMounted(async () => {
  initPagefind();

  window.addEventListener("keydown", (event) => triggerSearchViaKeyboard(event));

  await nextTick(() => {
    watchSearchInput();
  });
});

onUnmounted(() => {
  window.removeEventListener("keydown", (event) => triggerSearchViaKeyboard(event));
});
</script>

<style lang="scss">
@use "@styles/components/search.scss";
@use "@pagefind/default-ui/css/ui.css";
</style>
