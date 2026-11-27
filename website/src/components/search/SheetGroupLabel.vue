<template>
  <span class="c-sheet-group-label">{{ title }}<small data-summary>{{ summary }}</small></span>
</template>

<script setup lang="ts">
// Own component: inside c-accordion the sheet's @scope stops, so the row needs its own root.
defineProps<{ title: string; summary: string }>();
</script>

<style lang="scss">
@use "@styles/components/sheet-group-label";
</style>
