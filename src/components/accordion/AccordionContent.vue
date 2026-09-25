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
import { ACCORDION_ITEM_KEY } from "@components/accordion/keys";
import { computed, inject } from "vue";

const props = defineProps<{
  open?: boolean;
}>();

const itemCtx = inject(ACCORDION_ITEM_KEY, null);

const isOpen = computed(() => props.open ?? itemCtx?.isOpen.value ?? false);
</script>
