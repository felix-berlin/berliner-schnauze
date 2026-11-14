<template>
  <section class="c-bon-placement" aria-labelledby="bon-placement-title">
    <h2 id="bon-placement-title" class="title">Hier stehste · diese Woche</h2>
    <ol class="list">
      <li v-for="e in around" :key="e.rank" class="row" :aria-current="e.isMe ? 'true' : undefined">
        <span class="rank"><span class="u-sr-only">Platz</span> {{ e.rank }}</span>
        <span class="name">
          <b>{{ e.name }}</b>
          <span v-if="e.tag" class="tag">#{{ e.tag }}</span>
        </span>
        <span class="score">{{ e.score.toLocaleString("de-DE") }}</span>
      </li>
    </ol>
    <p v-if="missing" class="t-small">
      Noch {{ missing }} {{ missing === 1 ? "Punkt" : "Punkte" }} bis Platz {{ ahead!.rank }}.
    </p>
    <a class="c-textlink" href="/games/berliner-oder-nicht/rangliste">
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
const missing = computed(() =>
  ahead.value && me.value ? ahead.value.score - me.value.score + 1 : 0,
);
</script>

<style lang="scss">
@use "@styles/components/bon-placement";
</style>
