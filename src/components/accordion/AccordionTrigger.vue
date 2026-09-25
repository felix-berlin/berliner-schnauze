<template>
  <button
    :id="ctx.triggerId"
    type="button"
    class="c-accordion__trigger"
    :aria-expanded="ctx.isOpen.value"
    :aria-controls="ctx.contentId"
    :disabled="ctx.disabled.value"
    @click="ctx.toggle()"
  >
    <span class="c-accordion__trigger-label">
      <slot />
    </span>
    <span class="c-accordion__trigger-icon" aria-hidden="true">
      <slot name="icon">
        <component :is="ChevronDown" width="18" height="18" />
      </slot>
    </span>
  </button>
</template>

<script setup lang="ts">
import { ACCORDION_ITEM_KEY } from "@components/accordion/keys";
import { defineAsyncComponent, inject } from "vue";

const ChevronDown = defineAsyncComponent(() => import("virtual:icons/lucide/chevron-down"));

const ctx = inject(ACCORDION_ITEM_KEY);
if (!ctx) throw new Error("AccordionTrigger must be inside AccordionItem");
</script>
