<template>
  <div class="c-accordion__item" :class="{ 'is-open': isOpen, 'is-disabled': disabled }">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ACCORDION_ITEM_KEY, ACCORDION_KEY } from "@components/accordion/keys";
import { computed, inject, provide, useId } from "vue";

const props = defineProps<{
  value: string | number;
  disabled?: boolean;
}>();

const accordionCtx = inject(
  ACCORDION_KEY,
  () => {
    throw new Error("AccordionItem must be inside BaseAccordion");
  },
  true,
);

const triggerId = useId();
const contentId = useId();

const isOpen = computed(() => accordionCtx.isOpen(props.value));
const disabled = computed(() => props.disabled ?? false);

function toggle(): void {
  if (!disabled.value) accordionCtx.toggle(props.value);
}

provide(ACCORDION_ITEM_KEY, {
  contentId,
  disabled,
  isOpen,
  toggle,
  triggerId,
  value: props.value,
});
</script>
