<template>
  <dialog
    :id="props.uid"
    ref="currentModal"
    class="c-modal"
    :class="[
      `c-modal--${props.position}`,
      { 'has-close-on-click-outside': props.closeOnClickOutside },
      [props.class],
    ]"
    :style="`--width-modal: ${props.width}`"
    aria-modal="true"
    :closedby="props.closeOnClickOutside ? 'any' : 'closerequest'"
    @close="resetModal"
  >
    <template v-if="view.component">
      <ModalCloseButton v-if="props.showCloseButton" />

      <Component :is="view.component" v-bind="view.props" v-on="view.events || {}" />
    </template>
  </dialog>
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $element, $props, $view, preventScroll, resetModal } from "@stores/modal.ts";
import { useMutationObserver } from "@vueuse/core";
import { defineAsyncComponent, onMounted, useTemplateRef } from "vue";

const ModalCloseButton = defineAsyncComponent(() => import("@/components/ModalCloseButton.vue"));

const view = useStore($view);
const props = useStore($props);

const currentModal = useTemplateRef("currentModal");

onMounted(() => {
  $element.set(currentModal.value);
});

useMutationObserver(
  currentModal,
  (mutations) => {
    if ((mutations[0]?.target as HTMLDialogElement | undefined)?.open) preventScroll(true);
  },
  {
    attributes: true,
  },
);
</script>

<style lang="scss">
@use "@styles/components/modal";
</style>
