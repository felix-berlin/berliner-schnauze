<template>
  <a :href="routeToWord(randomElement(words).slug)" class="c-random-word-button">
    <Dices /> <span>zufälliges Wort</span>
  </a>
</template>

<script setup lang="ts">
import { routeToWord, randomElement } from "@utils/helpers";
import Dices from "virtual:icons/lucide/dices";
import type { BerlinerWord } from "@ts_types/generated/graphql";

interface RelatedWordsProps {
  words: BerlinerWord[];
}

const { words } = defineProps<RelatedWordsProps>();
</script>

<style scoped></style>
