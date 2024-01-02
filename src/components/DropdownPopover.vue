<template>
  <div class="c-dropdown">
    <button :popovertarget="dropdownId" popovertargetaction="toggle">
      <slot></slot>
    </button>
    <div :id="dropdownId" :anchor="dropdownId" popover>
      <slot name="content"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

export type DropdownPopoverProps = {
  id?: string;
};

const { id } = defineProps<DropdownPopoverProps>();

const dropdownId = ref(id ?? `dropdown-${Math.random() * 1000}`);
</script>

<style scoped></style>
