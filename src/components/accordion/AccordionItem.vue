<template>
  <div
    class="c-accordion__item"
    :class="{ 'is-open': isOpen, 'is-disabled': disabled }"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, provide, useId } from "vue";
import type { ComputedRef } from "vue";

import type { AccordionContext } from "@components/accordion/BaseAccordion.vue";

export interface AccordionItemContext {
  value: string | number;
  isOpen: ComputedRef<boolean>;
  toggle: () => void;
  triggerId: string;
  contentId: string;
  disabled: ComputedRef<boolean>;
}

const props = defineProps<{
  value: string | number;
  disabled?: boolean;
}>();

const accordionCtx = inject<AccordionContext>("accordion");
if (!accordionCtx) throw new Error("AccordionItem must be inside BaseAccordion");

const triggerId = useId();
const contentId = useId();

const isOpen = computed(() => accordionCtx!.isOpen(props.value));
const disabled = computed(() => props.disabled ?? false);

function toggle(): void {
  if (!disabled.value) accordionCtx!.toggle(props.value);
}

provide<AccordionItemContext>("accordion-item", {
  contentId,
  disabled,
  isOpen,
  toggle,
  triggerId,
  value: props.value,
});
</script>
