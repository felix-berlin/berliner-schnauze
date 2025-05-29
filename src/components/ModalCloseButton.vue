<template>
  <button
    class="c-modal__close c-button c-button--center-icon"
    :class="{
      'has-prefix': hasPrefix,
      'has-suffix': hasSuffix,
    }"
    type="button"
    aria-label="schließen"
    @click="
      close();
      emit('close');
    "
  >
    <slot name="prefix" />
    <slot><X /></slot>
    <slot name="suffix" />
  </button>
</template>

<script setup lang="ts">
import { useSlots } from "vue";
import { close } from "@stores/index.ts";
import X from "virtual:icons/lucide/x";

const emit = defineEmits(["close"]);
const slots = useSlots();

const hasPrefix = !!slots.prefix;
const hasSuffix = !!slots.suffix;
</script>
