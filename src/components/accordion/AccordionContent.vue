<template>
  <div
    :id="itemCtx?.contentId"
    class="c-accordion__body"
    :class="{ 'is-open': !itemCtx && isOpen }"
    role="region"
    :aria-labelledby="itemCtx?.triggerId"
  >
    <div class="c-accordion__content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";

import type { AccordionItemContext } from "@components/accordion/AccordionItem.vue";

const props = defineProps<{
  open?: boolean;
}>();

const itemCtx = inject<AccordionItemContext>("accordion-item", null as unknown as AccordionItemContext);

const isOpen = computed(() => props.open ?? itemCtx?.isOpen.value ?? false);
</script>
