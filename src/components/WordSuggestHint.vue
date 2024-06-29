<template>
  <div class="c-word-suggest-hint">
    <strong
      >Dieses Wort ist anscheinend noch nicht Teil des Wörterbuchs.<br />
      Möchtest du es hinzufügen?</strong
    >
    <button
      type="button"
      class="c-button c-button--center-icon c-word-suggest-hint__button"
      @click="getModalLoaded"
    >
      <Plus width="18" height="18" />Wort hinzufügen
    </button>

    <Modal
      v-if="loadModal"
      :open="showModal"
      position="center"
      :disable-scroll="true"
      @close="showModal = false"
      @mounted="modalMounted = true"
    >
      <SuggestWordForm :berliner-word="wordSearch.search" />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, defineAsyncComponent } from "vue";
import Plus from "virtual:icons/lucide/plus";
import { $wordSearch } from "@stores/index.ts";
import { useStore } from "@nanostores/vue";

const Modal = defineAsyncComponent(() => import("@components/Modal.vue"));
const SuggestWordForm = defineAsyncComponent(() => import("@components/SuggestWordForm.vue"));

const wordSearch = useStore($wordSearch);

const showModal = ref(false);
const loadModal = ref(false);
const modalMounted = ref(false);

/**
 * This function is responsible for loading and displaying the modal.
 * If the modal is already mounted, it will be displayed immediately.
 * If the modal is not yet mounted, it will trigger the loading of the modal.
 * It will then keep retrying to display the modal every 100ms until the modal is mounted.
 *
 * @return  {void}
 */
const getModalLoaded = (): void => {
  // If the modal is already mounted, display it immediately
  if (modalMounted.value) {
    showModal.value = true;
  } else {
    // If the modal is not yet loading, trigger the loading of the modal
    if (!loadModal.value) {
      loadModal.value = true;
    }
    // Retry to display the modal every 100ms until it is mounted
    setTimeout(getModalLoaded, 100);
  }
};
</script>

<style lang="scss">
@use "@styles/components/word-suggest-hint";
</style>
