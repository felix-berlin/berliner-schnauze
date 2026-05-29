<template>
  <component :is="level ? `h${level}` : 'div'" class="c-accordion__header">
    <slot />
  </component>
</template>

<script setup lang="ts">
defineProps<{
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}>();
</script>
