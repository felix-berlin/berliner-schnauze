<template>
  <button type="button" class="c-button c-button--back u-button-reset" @click="navigateBack">
    <slot />
  </button>
</template>

<script setup lang="ts">
const navigateBack = () => {
  window.history.back();
};
</script>

<style scoped></style>
