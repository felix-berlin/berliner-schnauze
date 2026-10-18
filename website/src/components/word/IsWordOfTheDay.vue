<template>
  <span v-if="isWordOfTheDay && variant === 'badge'" class="c-word-hero__wotd-badge">
    <Crown width="13" height="13" aria-hidden="true" />
    Wort des Tages
  </span>
  <span
    v-else-if="isWordOfTheDay"
    v-tooltip="{
      content: `${word}, ist das heutige Wort des Tages`,
      offset: 10,
      placement: tooltipPlacement,
    }"
    class="c-is-word-of-the-day"
    aria-hidden="true"
  >
    <Crown :width="iconSize" :height="iconSize" />
  </span>
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $wordOfTheDay } from "@stores/wordOfTheDay.ts";
import Crown from "virtual:icons/lucide/crown";
import { computed } from "vue";

interface IsWordOfTheDayProps {
  iconSize?: number;
  tooltipPlacement?: "bottom" | "left" | "right" | "top";
  variant?: "badge" | "icon";
  slug: string;
  word: string;
}

const {
  iconSize = 24,
  tooltipPlacement = "right",
  slug,
  variant = "icon",
  word,
} = defineProps<IsWordOfTheDayProps>();

const wordOfTheDay = useStore($wordOfTheDay);

const isWordOfTheDay = computed(() => {
  return slug === wordOfTheDay?.value?.word?.slug;
});
</script>
