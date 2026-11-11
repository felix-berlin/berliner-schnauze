<template>
  <div class="c-bon-result">
    <div class="c-bon-result__main">
      <header class="c-bon-result__head">
        <span v-if="isRecord" class="c-badge c-badge--strong c-bon-result__badge">
          <TrophyIcon width="16" height="16" aria-hidden="true" />
          Neuer Rekord!
        </span>
        <h1 ref="titleRef" tabindex="-1" class="c-band c-bon-result__title">
          {{ shownName ? `Aus die Maus, ${shownName}!` : "Aus die Maus!" }}
        </h1>
        <p class="t-em c-bon-result__why">
          {{ endedEarly ? "Du hast dit Spiel beendet." : "Drei Fehler – dit Spiel is vorbei." }}
        </p>
        <!-- No rank mostly means no cookie: then a rename finds no game and would only fail. -->
        <BonName v-if="result?.rank" :name="shownName || 'Anonym'" :tag="tag" @saved="onSaved" />
      </header>

      <dl class="c-bon-result__stats">
        <div class="c-bon-result__stat">
          <dt class="t-label">Punkte</dt>
          <dd class="c-bon-result__value">{{ score }}</dd>
        </div>
        <div class="c-bon-result__stat">
          <dt class="t-label">Platz</dt>
          <dd class="c-bon-result__value">{{ ranked ? ranked.rank : "–" }}</dd>
          <dd class="t-small c-bon-result__note">
            {{
              ranked
                ? `von ${ranked.totalGames} Spielen insgesamt · besser als ${beaten} %`
                : "Platzierung jerade nich da"
            }}
          </dd>
        </div>
        <div class="c-bon-result__stat">
          <dt class="t-label">Trefferquote</dt>
          <dd class="c-bon-result__value">{{ accuracy }}%</dd>
          <dd class="t-small c-bon-result__note">{{ correct }} von {{ history.length }} richtig</dd>
        </div>
        <div class="c-bon-result__stat">
          <dt class="t-label">Beste Serie</dt>
          <dd class="c-bon-result__value">{{ bestStreak }}</dd>
          <dd class="t-small c-bon-result__note">
            in Folge richtig · bis ×{{ computeMultiplier(bestStreak) }}
          </dd>
        </div>
      </dl>

      <div class="c-bon-result__actions">
        <button class="c-button c-button--primary" type="button" @click="emit('restart')">
          Nochmal spielen
        </button>
        <button class="c-choice" type="button" aria-live="polite" @click="share">
          {{ copied ? "Text kopiert" : "Ergebnis teilen" }}
        </button>
      </div>

      <p class="t-small">Dein Rekord: {{ record }} Punkte · gespeichert auf diesem Jerät</p>

      <BonPlacement v-if="around" :around="around" />

      <BonPlayerCode />
    </div>

    <section class="c-section-card c-bon-result__round" aria-labelledby="bon-round-title">
      <div class="c-section-card__header">
        <h2 id="bon-round-title" class="c-section-card__title">Deine Runde</h2>
      </div>
      <div class="c-section-card__body">
        <ol class="c-bon-result__list">
          <li v-for="(e, i) in history" :key="i" class="c-bon-result__row">
            <component
              :is="e.correct ? CheckIcon : XIcon"
              :class="`c-bon-result__mark c-bon-result__mark--${e.correct ? 'ok' : 'no'}`"
              role="img"
              :aria-label="e.correct ? 'richtig' : 'falsch'"
              width="20"
              height="20"
            />
            <span class="c-bon-result__word">
              <a
                v-if="e.isReal && e.slug"
                :href="routeToWord(e.slug)"
                class="c-textlink c-textlink--inline c-bon-result__link"
              >
                <b>{{ e.word }}</b> <span aria-hidden="true">→</span>
              </a>
              <template v-else-if="e.isReal">
                <b>{{ e.word }}</b>
              </template>
              <span v-else class="c-bon-result__fake">
                <s v-if="e.category === 'invented'">{{ e.word }}</s>
                <b v-else>{{ e.word }}</b>
                <span v-if="e.category" class="t-small">
                  {{ e.category === "invented" ? "erfunden" : "Hochdeutsch" }}
                </span>
              </span>
              <span v-if="e.translation" class="t-small">{{ e.translation }}</span>
            </span>
          </li>
        </ol>
      </div>
      <div class="c-section-card__footer">
        <a class="c-textlink" href="/">Alle Wörter im Wort-Index</a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { RoundEntry } from "@composables/useBon";
import type { FinishResult } from "@services/bonGameApi";
import type { PublicEntry } from "@services/bonLeaderboardApi";
import type { PlayerName } from "@services/bonPlayerApi.ts";

import BonName from "@components/games/BonName.vue";
import BonPlacement from "@components/games/BonPlacement.vue";
import BonPlayerCode from "@components/games/BonPlayerCode.vue";
import { computeMultiplier } from "@composables/useBon";
import { fetchLeaderboard } from "@services/bonLeaderboardApi";
import { trackEvent } from "@utils/analytics";
import { accuracyPercent, buildShareUrl } from "@utils/bonShare";
import { routeToWord } from "@utils/helpers";
import { cleanName } from "payload-app/bon-names";
import CheckIcon from "virtual:icons/lucide/check";
import TrophyIcon from "virtual:icons/lucide/trophy";
import XIcon from "virtual:icons/lucide/x";
import { computed, nextTick, onMounted, ref } from "vue";

const props = defineProps<{
  result?: FinishResult;
  history: RoundEntry[];
  score: number;
  bestStreak: number;
  previousHighScore: number;
  playerName: string;
  tag?: string;
  endedEarly: boolean;
}>();

// A rename on this page wins over the prop until the parent hands the same name down.
const renamed = ref<string>();
const currentName = computed(() => renamed.value ?? props.playerName);
const shownName = computed(() => currentName.value.trim() && cleanName(currentName.value.trim()));

const emit = defineEmits<{ restart: [] }>();

const titleRef = ref<HTMLHeadingElement | null>(null);
const copied = ref(false);

// Moving focus to the heading makes screen readers announce the result.
onMounted(() => nextTick(() => titleRef.value?.focus()));

// Without a rank (no cookie, failed finish) or when the call fails, the whole block stays out.
const around = ref<PublicEntry[]>();
// Latest request wins: a slow first reply must not bring the old name back after a rename.
let aroundRequest = 0;
async function loadAround() {
  if (!props.result?.rank) return;
  const mine = ++aroundRequest;
  try {
    const data = await fetchLeaderboard("week", 0, 0);
    if (mine === aroundRequest && data?.me?.around.some((e) => e.isMe))
      around.value = data.me.around;
  } catch {
    // The result is complete without it.
  }
}
onMounted(loadAround);

function onSaved({ name }: PlayerName) {
  renamed.value = name === "Anonym" ? "" : name;
  void loadAround();
}

const isRecord = computed(() => props.score > props.previousHighScore);
// $bonStats only catches up after the phase flips, so the new record is derived here.
const record = computed(() => Math.max(props.score, props.previousHighScore));
const correct = computed(() => props.history.filter((e) => e.correct).length);
const accuracy = computed(() => accuracyPercent(correct.value, props.history.length));
const ranked = computed(() => {
  const { rank, totalGames } = props.result ?? {};
  return rank && totalGames ? { rank, totalGames } : undefined;
});
const beaten = computed(() =>
  ranked.value
    ? Math.round(((ranked.value.totalGames - ranked.value.rank) / ranked.value.totalGames) * 100)
    : 0,
);

async function share() {
  trackEvent("Game", "Result Shared", "berliner-oder-nicht");
  const url =
    window.location.origin +
    buildShareUrl({
      bestStreak: props.bestStreak,
      correctAnswers: correct.value,
      date: new Date().toISOString(),
      playerName: shownName.value || undefined,
      score: props.score,
      totalAnswered: props.history.length,
    });
  const place = ranked.value ? ` – Platz ${ranked.value.rank}` : "";
  const text = `Ick hab ${props.score} Punkte bei ‚Berliner oder nicht?‘ jeschafft${place}. Schaffste mehr? ${url}`;
  try {
    if (navigator.share) await navigator.share({ text, title: "Berliner oder nicht?" });
    else {
      await navigator.clipboard.writeText(text);
      copied.value = true;
    }
  } catch {
    // Dismissed share sheet or blocked clipboard: nothing to report.
  }
}
</script>

<style lang="scss">
@use "@styles/components/bon-result";
</style>
