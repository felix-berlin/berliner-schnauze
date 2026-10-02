<template>
  <div class="c-confirm-dialog">
    <p class="c-confirm-dialog__message">{{ message }}</p>
    <div class="c-confirm-dialog__actions">
      <button type="button" class="c-button c-button--center-icon" @click="emit('cancel')">
        Abbrechen
      </button>
      <button
        type="button"
        class="c-button c-button--center-icon c-button--primary"
        @click="emit('confirm')"
      >
        Bestätigen
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ message: string }>();
const emit = defineEmits<{ confirm: []; cancel: [] }>();
</script>

<style lang="scss">
@use "@styles/components/confirm-dialog";
</style>
