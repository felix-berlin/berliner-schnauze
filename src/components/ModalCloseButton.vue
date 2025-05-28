<template>
  <button
    class="c-modal__close c-button c-button--center-icon"
    type="button"
    aria-label="schließen"
    @click="
      close();
      emit('close');
    "
  >
    <X />
  </button>
</template>

<script setup lang="ts">
import { close } from "@stores/index.ts";
import X from "virtual:icons/lucide/x";

const emit = defineEmits(["close"]);
</script>

<style scoped></style>
