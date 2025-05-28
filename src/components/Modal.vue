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
    <template v-if="hasView">
      <ModalCloseButton v-if="props.showCloseButton" />

      <Component
        :is="view?.component"
        v-bind="view?.props"
        v-if="viewIsComponent"
        v-on="view?.events || {}"
      />

      <div v-else v-html="view" />
    </template>
  </dialog>
</template>

<script setup lang="ts">
import { useTemplateRef, onMounted, computed } from "vue";
import ModalCloseButton from "@/components/ModalCloseButton.vue";
import { useStore } from "@nanostores/vue";
import {
  $element,
  $view,
  $props,
  $viewIsComponent,
  $isOpen,
  preventScroll,
  resetModal,
} from "@stores/modal.ts";
import { useMutationObserver } from "@vueuse/core";

const view = useStore($view);
const props = useStore($props);
const viewIsComponent = useStore($viewIsComponent);

const currentModal = useTemplateRef("currentModal");

const hasView = computed(() => view.value && Object.keys(view.value).length > 0);

onMounted(() => {
  $element.set(currentModal.value);
});

useMutationObserver(
  currentModal,
  (mutations) => {
    if (!mutations[0]) return;
    const open = !!mutations[0].target?.open;
    $isOpen.set(open);

    if (open && props.value.disableScroll) {
      preventScroll(true);
    }
  },
  {
    attributes: true,
  },
);
</script>

<style lang="scss">
@use "@styles/components/modal";
</style>
