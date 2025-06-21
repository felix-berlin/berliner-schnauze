<template>
  <button
    v-if="canGoBack"
    type="button"
    class="c-button c-button--back u-button-reset"
    @click="navigateBack"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

const canGoBack = ref(false);

/**
 * Navigate back to the previous page
 *
 * @return  {void}
 */
const navigateBack = (): void => {
  window.history.back();
};

onMounted(() => {
  canGoBack.value = window.history.length > 1;
});
</script>

<style scoped></style>
