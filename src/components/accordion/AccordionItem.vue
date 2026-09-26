<template>
  <details class="c-accordion__item" :name :open>
    <slot />
  </details>
</template>

<script setup lang="ts">
// Native <details>: works without hydration. Items sharing a `name` form an
// exclusive group (only one open at a time).
defineProps<{
  name?: string;
  open?: boolean;
}>();
</script>
