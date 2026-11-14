<template>
  <div
    class="c-word-list-skeleton"
    :style="{ '--word-list-skeleton-row-size': `${itemSize}px` }"
    role="status"
    aria-busy="true"
    aria-label="Momentchen, ick blätter noch durch't Wörterbuch…"
  >
    <div v-for="row in ROW_COUNT" :key="row" class="row" aria-hidden="true">
      <span class="lines">
        <span class="bar" data-kind="word" />
        <span class="bar" data-kind="translation" />
      </span>
      <span class="icon" />
    </div>
  </div>
</template>

<script setup lang="ts">
const { itemSize = 110 } = defineProps<{
  itemSize?: number;
}>();

const ROW_COUNT = 6;
</script>

<style lang="scss">
@use "@styles/components/word-list-skeleton";
</style>
