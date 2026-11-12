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
        <!-- Only a stored result has a game a rename can find. -->
        <BonName v-if="result" :name="shownName || 'Anonym'" :tag="tag" @saved="onSaved" />
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
                ? `von ${ranked.totalPlayers} Spielern diese Woche · besser als ${beaten} %`
                : finishError
                  ? `Nich in der Rangliste: ${finishError.message}`
                  : "Platzierung jerade nich da"
            }}
          </dd>
          <dd v-if="finishError?.retryable">
            <button class="c-choice" type="button" @click="emit('retryFinish')">
              Nochmal speichern
            </button>
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
        <button
          class="c-button c-button--primary c-button--lg c-bon-result__again"
          type="button"
          @click="emit('restart')"
        >
          Nochmal spielen
        </button>
        <button
          class="c-choice c-bon-result__share"
          type="button"
          aria-live="polite"
          @click="share"
        >
          <ShareIcon width="16" height="16" aria-hidden="true" />
          {{ copied ? "Text kopiert" : "Ergebnis teilen" }}
        </button>
      </div>
      <p v-if="shareFailed" class="t-small" role="alert">
        Teilen hat nich jeklappt – versuch’s nochmal.
      </p>

      <p class="t-small">Dein Rekord: {{ record }} Punkte · gespeichert auf diesem Jerät</p>

      <BonPlacement v-if="around" :around="around" />

      <BonPlayerCode />
    </div>

    <section
      class="c-section-card c-section-card--sheet c-bon-result__round"
      aria-labelledby="bon-round-title"
    >
      <div class="c-section-card__header">
        <h2 id="bon-round-title" class="c-section-card__title">Deine Runde</h2>
      </div>
      <div class="c-section-card__body">
        <ol class="c-bon-result__list">
          <li v-for="(e, i) in history" :key="i">
            <!-- Mock "Deine Runde": the whole row links a real word; mark, word over its note, arrow. -->
            <component
              :is="e.isReal && e.slug ? 'a' : 'span'"
              :href="e.isReal && e.slug ? routeToWord(e.slug) : undefined"
              class="c-bon-result__row"
              :class="{ 'c-bon-result__row--fake': !e.isReal }"
            >
              <component
                :is="e.correct ? CheckIcon : XIcon"
                :class="`c-bon-result__mark c-bon-result__mark--${e.correct ? 'ok' : 'no'}`"
                role="img"
                :aria-label="e.correct ? 'richtig' : 'falsch'"
                width="20"
                height="20"
              />
              <span class="c-bon-result__word">
                <s v-if="e.category === 'invented'">{{ e.word }}</s>
                <b v-else>{{ e.word }}</b>
                <span v-if="e.translation" class="t-small">{{ e.translation }}</span>
                <span v-else-if="e.category" class="t-small">
                  {{ e.category === "invented" ? "erfunden" : "Hochdeutsch" }}
                </span>
              </span>
              <span v-if="e.isReal && e.slug" class="c-bon-result__arrow" aria-hidden="true"
                >→</span
              >
            </component>
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
import type { BonError, RoundEntry } from "@composables/useBon";
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
import { ANONYM, cleanName } from "payload-app/bon-names";
import CheckIcon from "virtual:icons/lucide/check";
import ShareIcon from "virtual:icons/lucide/share-2";
import TrophyIcon from "virtual:icons/lucide/trophy";
import XIcon from "virtual:icons/lucide/x";
import { computed, nextTick, onMounted, ref, watch } from "vue";

const props = defineProps<{
  result?: FinishResult;
  history: RoundEntry[];
  score: number;
  bestStreak: number;
  previousHighScore: number;
  playerName: string;
  tag?: string;
  endedEarly: boolean;
  finishError?: BonError;
}>();

// A rename on this page wins over the prop until the parent hands the same name down.
const renamed = ref<string>();
const currentName = computed(() => renamed.value ?? props.playerName);
const shownName = computed(() => currentName.value.trim() && cleanName(currentName.value.trim()));

const emit = defineEmits<{ restart: []; retryFinish: [] }>();

const titleRef = ref<HTMLHeadingElement | null>(null);
const copied = ref(false);
const shareFailed = ref(false);

// Moving focus to the heading makes screen readers announce the result.
onMounted(() => nextTick(() => titleRef.value?.focus()));

// The neighbours come with the finish reply; without a rank (no cookie, failed finish) the block stays out.
const own = (list?: PublicEntry[]) => (list?.some((e) => e.isMe) ? list : undefined);
const around = ref(own(props.result?.around));
// A retried save brings the rank later.
watch(
  () => props.result,
  (result) => (around.value = own(result?.around)),
);
// Latest request wins: a slow first reply must not bring the old name back after a rename.
let aroundRequest = 0;
/** After a rename the neighbours show the new name; on a failed call the old ones stay. */
async function loadAround() {
  if (!props.result?.rank) return;
  const mine = ++aroundRequest;
  try {
    const data = await fetchLeaderboard("week", 0, 0);
    if (mine === aroundRequest && own(data?.me?.around)) around.value = data.me!.around;
  } catch {
    // The result is complete without it.
  }
}

function onSaved({ name }: PlayerName) {
  renamed.value = name === ANONYM ? "" : name;
  void loadAround();
}

const isRecord = computed(() => props.score > props.previousHighScore);
// $bonStats only catches up after the phase flips, so the new record is derived here.
const record = computed(() => Math.max(props.score, props.previousHighScore));
const correct = computed(() => props.history.filter((e) => e.correct).length);
const accuracy = computed(() => accuracyPercent(correct.value, props.history.length));
const ranked = computed(() => {
  const { rank, totalPlayers } = props.result ?? {};
  return rank && totalPlayers ? { rank, totalPlayers } : undefined;
});
const beaten = computed(() =>
  ranked.value
    ? Math.round(
        ((ranked.value.totalPlayers - ranked.value.rank) / ranked.value.totalPlayers) * 100,
      )
    : 0,
);

async function share() {
  trackEvent("Game", "Result Shared", "berliner-oder-nicht");
  shareFailed.value = false;
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
  } catch (error) {
    // A dismissed share sheet is no failure; a blocked clipboard is.
    if ((error as Error).name !== "AbortError") shareFailed.value = true;
  }
}
</script>

<style lang="scss">
@use "@styles/components/bon-result";
</style>
