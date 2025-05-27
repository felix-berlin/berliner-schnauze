<template>
  <dialog
    v-show="isOpen"
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
    tabindex="0"
    @click="onClickOutside($event)"
    @keydown.esc="onKeyDown"
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
  close,
  onClickOutside,
} from "@stores/modal.ts";

const view = useStore($view);
const props = useStore($props);
const viewIsComponent = useStore($viewIsComponent);
const isOpen = useStore($isOpen);

const currentModal = useTemplateRef("currentModal");

const hasView = computed(() => view.value && Object.keys(view.value).length > 0);

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Escape" && props.closeOnClickOutside) {
    close();
  }
};

onMounted(() => {
  $element.set(currentModal.value);
});
</script>

<style lang="scss">
@use "@styles/components/modal";
</style>
