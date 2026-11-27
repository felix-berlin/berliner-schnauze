<template>
  <li class="hit">
    <a :href="`/wort/${hit.entry.slug}`">{{ hit.entry.wordProperties.berlinerisch }}</a>
    <span v-if="meaning">{{ meaning }}</span>
  </li>
</template>

<script setup lang="ts">
import type { RankedHit } from "@lib/search/types";

import { computed } from "vue";

const props = defineProps<{ hit: RankedHit }>();
const meaning = computed(() => props.hit.entry.wordProperties.translations[0]);
</script>
