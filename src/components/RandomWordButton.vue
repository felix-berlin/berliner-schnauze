<template>
  <a :href="routeToWord(randomElement(words).slug)" class="c-random-word-button">
    <Dices /> <span>zufälliges Wort</span>
  </a>
</template>

<script setup lang="ts">
import { randomElement, routeToWord } from "@utils/helpers.ts";
import Dices from "virtual:icons/lucide/dices";

import type { WordRef } from "@utils/wordHelper";

interface RelatedWordsProps {
  words: WordRef[];
}

const { words } = defineProps<RelatedWordsProps>();
</script>

<style scoped></style>
