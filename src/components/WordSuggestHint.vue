<template>
  <div class="c-word-suggest-hint">
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
import { useStore } from "@nanostores/vue";
import { open } from "@stores/modal.ts";
import { $wordSearch } from "@stores/wordList.ts";
import Plus from "virtual:icons/lucide/plus";
import { defineAsyncComponent } from "vue";

const wordSearch = useStore($wordSearch);

const openWordSuggestionModal = () => {
  open({
    view: {
      component: defineAsyncComponent(() => import("@components/SuggestWordForm.vue")),
      props: {
        berlinerWord: wordSearch.value.search || undefined,
      },
    },
  });
};
</script>

<style lang="scss">
@use "@styles/components/word-suggest-hint";
</style>
