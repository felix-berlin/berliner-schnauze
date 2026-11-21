<template>
  <!-- keydown on the root: the arrow keys answer only while the focus is inside the teaser (SPEC §9). -->
  <div class="c-home-bon" @keydown="onKey">
    <div class="inner">
      <div class="intro">
        <h2>Berliner oder nich?</h2>
        <p class="sub">
          Echtet Berlinerisch oder frei erfunden? Lies dit Wort, entscheide dich. 20 Karten, 3
          Leben, und für jede Serie jibt’s mehr Punkte.
        </p>
        <!-- role="list": Safari drops list semantics of an unstyled list. -->
        <ol class="mult" role="list" aria-label="Multiplikator">
          <li v-for="s in steps" :key="s.from">
            <span v-if="s.from > 0">ab {{ s.from }}</span>
            <b>×{{ s.mult }}</b>
          </li>
        </ol>
        <div class="actions">
          <a class="play" :href="GAME">
            Jetzt spielen <IconArrowRight class="arrow" aria-hidden="true" />
          </a>
          <a class="board" :href="`${GAME}/rangliste`">Rangliste dieser Woche</a>
        </div>
        <p class="rounds"><b>{{ roundsToday.toLocaleString("de-DE") }}</b> Runden heute jespielt</p>
      </div>

      <div v-if="card" class="trial">
        <div class="stack">
          <span class="back" aria-hidden="true" />
          <span class="back" aria-hidden="true" />
          <div
            v-if="!shown"
            class="card"
            :data-state="answer === null ? undefined : answer ? 'yes' : 'no'"
            @pointerdown="swipeStart = $event.clientX"
            @pointerup="onSwipe"
          >
            <p class="label">Is ditt Berlinerisch?</p>
            <p class="word">{{ card.word }}</p>
            <p class="note">Die am häufigsten falsch jeratene Karte</p>
          </div>
          <!-- The trial card never calls the BON API: it does not count for the ranking (SPEC §9). -->
          <div class="status" role="status">
            <div v-if="result" class="result" :data-state="result.correct ? 'ok' : 'wrong'">
              <p ref="resultHeading" class="head" tabindex="-1">{{ result.head }}</p>
              <p class="text">
                <b>{{ card.word }}</b> {{ result.fact }} {{ card.wrongShare }} % haben hier „{{
                  result.wrongLabel
                }}“ jetippt.
              </p>
              <div class="links">
                <a v-if="card.isReal && card.slug" :href="routeToWord(card.slug)"
                  >{{ card.word }} nachschlagen</a
                >
                <a class="go" :href="GAME"
                  >Weiterspielen <IconArrowRight class="arrow" aria-hidden="true"
                /></a>
              </div>
              <button class="again" type="button" @click="reset">Nochmal die Probekarte</button>
            </div>
          </div>
        </div>
        <template v-if="answer === null">
          <div class="answers">
            <button
              ref="firstAnswer"
              type="button"
              aria-keyshortcuts="ArrowLeft"
              @click="give(false)"
            >
              ← Nee, erfunden
            </button>
            <button type="button" aria-keyshortcuts="ArrowRight" @click="give(true)">
              Ja, Berlinerisch →
            </button>
          </div>
          <p class="hint">
            <span class="keys">Jeht ooch mit den Pfeiltasten.</span>
            <span class="swipe">Jeht ooch mit Wischen.</span>
          </p>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { HomeStats } from "payload-app/home-stats-load";

import { routeToWord } from "@utils/helpers.ts";
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onBeforeUnmount,
  ref,
  useTemplateRef,
} from "vue";

const IconArrowRight = defineAsyncComponent(() => import("virtual:icons/lucide/arrow-right"));

const props = defineProps<{
  steps: HomeStats["bon"]["steps"];
  roundsToday: number;
  card: HomeStats["bon"]["card"];
}>();

const GAME = "/games/berliner-oder-nicht";
const FLY_MS = 450; // the card's fly-out (SPEC §9)
const SWIPE_PX = 60;

/** true = „Ja, Berlinerisch“, false = „Nee, erfunden“, null = not answered yet. */
const answer = ref<boolean | null>(null);
const shown = ref(false);
const swipeStart = ref<number | null>(null);
const heading = useTemplateRef<HTMLElement>("resultHeading");
const firstAnswer = useTemplateRef<HTMLElement>("firstAnswer");
let timer: ReturnType<typeof setTimeout> | undefined;
onBeforeUnmount(() => clearTimeout(timer));

const result = computed(() => {
  const c = props.card;
  if (!shown.value || !c || answer.value === null) return null;
  const correct = answer.value === c.isReal;
  return {
    correct,
    // TODO(startseite): copy for fake words („Richtig, ditt is erfunden!“, „is frei erfunden.“) to be confirmed.
    fact: c.isReal
      ? c.meaning
        ? `is echtet Berlinerisch: ${c.meaning}.`
        : "is echtet Berlinerisch."
      : "is frei erfunden.",
    head: correct
      ? c.isReal
        ? "Richtig, ditt is Berlinerisch!"
        : "Richtig, ditt is erfunden!"
      : "Knapp daneben!",
    // What most players got wrong: the opposite of the truth.
    wrongLabel: c.isReal ? "erfunden" : "Berlinerisch",
  };
});

const show = async () => {
  shown.value = true;
  await nextTick();
  heading.value?.focus();
};

const give = (yes: boolean) => {
  if (answer.value !== null) return;
  answer.value = yes;
  // Without motion the transition never runs, so the result follows at once.
  const motion = window.matchMedia?.("(prefers-reduced-motion: no-preference)").matches;
  if (motion) timer = setTimeout(show, FLY_MS);
  else void show();
};

const reset = async () => {
  clearTimeout(timer);
  answer.value = null;
  shown.value = false;
  await nextTick();
  firstAnswer.value?.focus();
};

const onKey = (e: KeyboardEvent) => {
  if (!props.card || answer.value !== null || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  e.preventDefault();
  give(e.key === "ArrowRight");
};

const onSwipe = (e: PointerEvent) => {
  const dx = swipeStart.value === null ? 0 : e.clientX - swipeStart.value;
  swipeStart.value = null;
  if (Math.abs(dx) >= SWIPE_PX) give(dx > 0);
};
</script>

<style lang="scss">
@use "@styles/components/home-bon";
</style>
