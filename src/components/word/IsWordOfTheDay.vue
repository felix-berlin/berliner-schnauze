<template>
  <span
    v-if="isWordOfTheDay"
    v-tooltip="{
      content: `${word} ist das heutige Wort des Tages`,
      distance: 10,
      placement: 'right',
    }"
    class="c-single-word__crown"
    aria-hidden="true"
  >
    <Crown />
  </span>
</template>

<script setup lang="ts">
import { onBeforeMount, computed } from "vue";
import Crown from "virtual:icons/lucide/crown";
import { useStore } from "@nanostores/vue";
import { wordOfTheDay, getWordOfTheDay } from "@stores/index";

interface IsWordOfTheDayProps {
  wordId: number;
  word: string;
}

const { wordId, word } = defineProps<IsWordOfTheDayProps>();

const dailyWord = useStore(wordOfTheDay);

const isWordOfTheDay = computed(() => {
  return wordId === dailyWord.value.word.ID;
});

onBeforeMount(() => {
  getWordOfTheDay();
});
</script>

<style scoped></style>
