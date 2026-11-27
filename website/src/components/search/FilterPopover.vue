<template>
  <dialog
    :id="id"
    ref="dialog"
    popover="auto"
    class="c-filter-popover"
    :aria-labelledby="`${id}-title`"
    @toggle="onToggle"
  >
    <h2 :id="`${id}-title`" class="title">{{ title }}</h2>
    <p class="intro">{{ intro }}</p>
    <div data-slot><slot /></div>
    <div class="foot">
      <small>{{ count }}</small>
      <!-- Filters apply at once; „Fertig“ only closes, and the browser returns focus to the chip. -->
      <button type="button" class="done" :popovertarget="id" popovertargetaction="hide">
        Fertig
      </button>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { useTemplateRef } from "vue";

defineProps<{ id: string; title: string; intro: string; count: string }>();
const emit = defineEmits<{ toggle: [open: boolean] }>();

const dialog = useTemplateRef("dialog");

// Non-modal (design doc: no focus trap); focus starts on the first option (SPEC §12).
function onToggle(e: Event) {
  const open = (e as ToggleEvent).newState === "open";
  emit("toggle", open);
  if (open)
    dialog.value
      ?.querySelector<HTMLElement>("[data-slot] :is(button, input, select):not(:disabled)")
      ?.focus();
}
</script>

<style lang="scss">
@use "@styles/components/filter-popover";
</style>
