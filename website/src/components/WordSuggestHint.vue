<template>
  <div
    ref="root"
    class="c-word-suggest-hint"
    data-track-content
    data-content-name="Word Suggest CTA"
    data-content-piece="Wort vorschlagen"
    data-content-target="#"
  >
    <strong class="c-word-suggest-hint__text"
      >Dieses Wort ist anscheinend noch nicht Teil des Wörterbuchs.<br />
      Möchtest du es hinzufügen?</strong
    >
    <button
      type="button"
      class="c-button c-button--center-icon c-word-suggest-hint__button"
      @click="openWordSuggestionModal"
    >
      <Plus width="18" height="18" />Wort hinzufügen
    </button>
  </div>
</template>

<script setup lang="ts">
import { useContentTracking } from "@composables/useContentTracking";
import { useStore } from "@nanostores/vue";
import { open } from "@stores/modal.ts";
import { $searchQuery } from "@stores/wordList.ts";
import Plus from "virtual:icons/lucide/plus";
import { defineAsyncComponent, ref } from "vue";

const root = ref<HTMLElement | null>(null);
useContentTracking(root);

const searchQuery = useStore($searchQuery);

const openWordSuggestionModal = () => {
  open({
    view: {
      component: defineAsyncComponent(() => import("@components/SuggestWordForm.vue")),
      props: {
        berlinerWord: searchQuery.value || undefined,
      },
    },
  });
};
</script>

<style lang="scss">
@use "@styles/components/word-suggest-hint";
</style>
