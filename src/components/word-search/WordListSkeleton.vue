<template>
  <div
    class="c-word-list-skeleton"
    :style="{ '--word-list-skeleton-row-size': `${itemSize}px` }"
    role="status"
    aria-busy="true"
    aria-label="Momentchen, ick blätter noch durch't Wörterbuch…"
  >
    <div v-for="row in ROW_COUNT" :key="row" class="c-word-list-skeleton__row" aria-hidden="true">
      <span class="c-word-list-skeleton__lines">
        <span class="c-word-list-skeleton__bar c-word-list-skeleton__bar--word" />
        <span class="c-word-list-skeleton__bar c-word-list-skeleton__bar--translation" />
      </span>
      <span class="c-word-list-skeleton__icon" />
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
