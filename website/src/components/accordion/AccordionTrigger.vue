<template>
  <summary class="c-accordion__trigger">
    <component :is="level ? `h${level}` : 'span'" class="c-accordion__trigger-label">
      <slot />
    </component>
    <span class="c-accordion__trigger-icon" aria-hidden="true">
      <slot name="icon">
        <component :is="ChevronDown" width="18" height="18" />
      </slot>
    </span>
  </summary>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";

defineProps<{
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}>();

const ChevronDown = defineAsyncComponent(() => import("virtual:icons/lucide/chevron-down"));
</script>
