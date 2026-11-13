<template>
  <a
    ref="root"
    :href="target"
    class="c-random-word-button"
    data-track-content
    data-content-name="Random Word CTA"
    data-content-piece="Zufälliges Wort"
    :data-content-target="target"
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

// Once, so the link and the tracked target name the same word.
const target = routeToWord(randomElement(words).slug);

const root = ref<HTMLAnchorElement | null>(null);
useContentTracking(root);
</script>
