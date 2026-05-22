<template>
  <div class="c-confirm-dialog">
    <p class="c-confirm-dialog__message">{{ message }}</p>
    <div class="c-confirm-dialog__actions">
      <button type="button" class="c-button c-button--center-icon" @click="emit('cancel')">
        Abbrechen
      </button>
      <button
        type="button"
        class="c-button c-button--center-icon c-button--theme"
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
.c-confirm-dialog {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;

  &__message {
    margin: 0;
    font-size: 1.1rem;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }
}
</style>
