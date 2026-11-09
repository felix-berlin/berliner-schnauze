<template>
  <a
    ref="root"
    :href="routeToWord(randomElement(words).slug)"
    class="c-random-word-button"
    data-track-content
    data-content-name="Random Word CTA"
    data-content-piece="Zufälliges Wort"
    :data-content-target="routeToWord(randomElement(words).slug)"
  >
    <slot><Dices /> <span>zufälliges Wort</span></slot>
  </a>
</template>

<script setup lang="ts">
import type { WordRef } from "@utils/wordHelper";

import { useContentTracking } from "@composables/useContentTracking";
import { randomElement, routeToWord } from "@utils/helpers.ts";
import Dices from "virtual:icons/lucide/dices";
import { ref } from "vue";

interface RandomWordButtonProps {
  words: WordRef[];
}

const { words } = defineProps<RandomWordButtonProps>();

const root = ref<HTMLAnchorElement | null>(null);
useContentTracking(root);
</script>
