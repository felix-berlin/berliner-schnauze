<template>
  <section class="c-bon-placement" aria-labelledby="bon-placement-title">
    <h2 id="bon-placement-title" class="c-bon-placement__title">Hier stehste · diese Woche</h2>
    <ol class="c-bon-placement__list">
      <li
        v-for="e in around"
        :key="e.rank"
        class="c-bon-placement__row"
        :class="{ 'c-bon-placement__row--me': e.isMe }"
        :aria-current="e.isMe ? 'true' : undefined"
      >
        <span class="c-bon-placement__rank"><span class="u-sr-only">Platz</span> {{ e.rank }}</span>
        <span class="c-bon-placement__name">
          <b>{{ e.name }}</b>
          <span v-if="e.tag" class="c-bon-placement__tag">#{{ e.tag }}</span>
        </span>
        <span class="c-bon-placement__score">{{ e.score.toLocaleString("de-DE") }}</span>
      </li>
    </ol>
    <p v-if="missing" class="t-small c-bon-placement__gap">
      Noch {{ missing }} {{ missing === 1 ? "Punkt" : "Punkte" }} bis Platz {{ ahead!.rank }}.
    </p>
    <a class="c-textlink c-bon-placement__more" href="/games/berliner-oder-nicht/rangliste">
      Ganze Rangliste ansehen →
    </a>
  </section>
</template>

<script setup lang="ts">
import type { PublicEntry } from "@services/bonLeaderboardApi";

import { computed } from "vue";

const props = defineProps<{ around: PublicEntry[] }>();

const me = computed(() => props.around.find((e) => e.isMe));
// Rank 1 has nobody ahead, so no hint.
const ahead = computed(() => props.around.find((e) => me.value && e.rank === me.value.rank - 1));
const missing = computed(() => (ahead.value && me.value ? ahead.value.score - me.value.score + 1 : 0));
</script>

<style lang="scss">
@use "@styles/components/bon-placement";
</style>
