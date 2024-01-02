<template>
  <span
    v-if="isWordOfTheDay"
    v-tooltip="{
      content: `${word} ist das heutige Wort des Tages`,
      distance: 10,
      placement: 'right',
    }"
    class="c-word-of-the-day-crown"
    aria-hidden="true"
  >
    <Crown />
  </span>
</template>

<script setup lang="ts">
import { onBeforeMount, computed } from "vue";
import Crown from "virtual:icons/lucide/crown";
import { useStore } from "@nanostores/vue";
import { $wordOfTheDay, getWordOfTheDay } from "@stores/index";
import type { WordProperties } from "@ts_types/generated/graphql";

interface IsWordOfTheDayProps {
  wordId: number;
  word: WordProperties["berlinerisch"];
}

const { wordId, word } = defineProps<IsWordOfTheDayProps>();

const wordOfTheDay = useStore($wordOfTheDay);

const isWordOfTheDay = computed(() => {
  return wordId === wordOfTheDay?.value?.word?.ID;
});

onBeforeMount(() => {
  if (!wordOfTheDay.value?.word?.ID) {
    getWordOfTheDay();
  }
});
</script>

<style scoped></style>
