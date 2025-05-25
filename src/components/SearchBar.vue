<template>
  <div :id="id" class="c-search" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";

export interface SearchBarProps {
  id: string;
}

const props = defineProps<SearchBarProps>();

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
  window.addEventListener("keydown", (event) => triggerSearchViaKeyboard(event));
});

onUnmounted(() => {
  window.removeEventListener("keydown", (event) => triggerSearchViaKeyboard(event));
});
</script>

<style lang="scss">
@use "@styles/components/search.scss";
</style>
