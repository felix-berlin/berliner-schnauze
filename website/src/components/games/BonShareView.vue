<template>
  <div
    ref="root"
    class="c-bon-share-view"
    data-track-content
    data-content-name="BON Share Result"
    :data-content-piece="contentPiece"
    data-content-target="/games/berliner-oder-nicht"
  >
    <template v-if="payload">
      <h1 class="title">
        {{ payload.playerName ? `${payload.playerName}s Spielergebnis` : "Spielergebnis" }}
      </h1>

      <dl class="stats">
        <div class="stat">
          <dt class="label">Score</dt>
          <dd class="value">{{ payload.score }}</dd>
        </div>
        <div class="stat">
          <dt class="label">Best Streak</dt>
          <dd class="value">{{ payload.bestStreak }}</dd>
        </div>
        <div class="stat">
          <dt class="label">Genauigkeit</dt>
          <dd class="value">{{ accuracyPercent }}%</dd>
        </div>
        <div class="stat">
          <dt class="label">Antworten</dt>
          <dd class="value">{{ payload.totalAnswered }}</dd>
        </div>
      </dl>

      <p class="date">{{ formattedDate }}</p>

      <a href="/games/berliner-oder-nicht" class="cta">
        Selbst spielen <span aria-hidden="true">→</span>
      </a>
    </template>

    <template v-else>
      <p class="error" role="alert">Kein gültiges Ergebnis gefunden.</p>
      <a href="/games/berliner-oder-nicht" class="cta">
        Zum Spiel <span aria-hidden="true">→</span>
      </a>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { BonSharePayload } from "@utils/bonShare";

import { useContentTracking } from "@composables/useContentTracking";
import { accuracyPercent as toAccuracyPercent, decodeShareHash } from "@utils/bonShare";
import { formattedDate as formatDate } from "@utils/helpers";
import { useUrlSearchParams } from "@vueuse/core";
import { isOffensiveName, visibleName } from "payload-app/bon-names";
import { computed, ref } from "vue";

const root = ref<HTMLElement | null>(null);
useContentTracking(root);

const params = useUrlSearchParams("history");
const payload = computed<BonSharePayload | null>(() => {
  const r = params.r;
  const decoded = r ? decodeShareHash(Array.isArray(r) ? r[0] : r) : null;
  // The link is anyone's to write: an offensive name shows as no name. The app strips format characters before a name is
  // stored, so one that still holds them is hand-made ("\u202EizaN" renders as "Nazi") and shows as no name too.
  const name = decoded?.playerName;
  return name && (visibleName(name) !== name || isOffensiveName(name))
    ? { ...decoded, playerName: undefined }
    : decoded;
});

const accuracyPercent = computed(() =>
  payload.value ? toAccuracyPercent(payload.value.correctAnswers, payload.value.totalAnswered) : 0,
);

const formattedDate = computed(() => formatDate(payload.value?.date) ?? "");

const contentPiece = computed(() =>
  payload.value
    ? `Score ${payload.value.score}${payload.value.playerName ? ` – ${payload.value.playerName}` : ""}`
    : "Spielergebnis",
);
</script>

<style lang="scss">
@use "@styles/components/bon-share-view";
</style>
