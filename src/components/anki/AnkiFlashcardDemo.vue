<template>
  <div class="c-anki-flashcard">
    <div class="c-anki-flashcard__paper c-anki-flashcard__paper--back"></div>
    <div class="c-anki-flashcard__paper c-anki-flashcard__paper--front"></div>
    <div class="c-anki-flashcard__card">
      <div class="c-anki-flashcard__head">
        <span>Berliner Schnauze ᛫ Anki</span>
        <span>Noch {{ remaining }} heute</span>
      </div>
      <div class="c-anki-flashcard__body">
        <div class="c-anki-flashcard__word">{{ card.title }}</div>
        <div v-if="flipped" class="c-anki-flashcard__answer">
          <div class="c-anki-flashcard__meaning">{{ card.meaning }}</div>
          <div v-if="card.example" class="c-anki-flashcard__example">„{{ card.example }}“</div>
        </div>
      </div>
      <div v-if="!flipped" class="c-anki-flashcard__foot">
        <button type="button" class="c-button" @click="flip">Antwort zeigen</button>
      </div>
      <div v-else class="c-anki-flashcard__ratings">
        <button
          v-for="r in ratings"
          :key="r.label"
          type="button"
          :class="['c-button', 'c-anki-flashcard__rating', `c-anki-flashcard__rating--${r.type}`]"
          @click="next"
        >
          <span class="c-anki-flashcard__rating-interval">{{ r.interval }}</span>
          <span class="c-anki-flashcard__rating-label">{{ r.label }}</span>
        </button>
      </div>
    </div>
    <p class="c-anki-flashcard__hint">Probier's aus: Karte aufdecken, ehrlich bewerten.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

// ponytail: real word data (title/meaning/example) verified against the WordPress
// dictionary on 2026-09-22 — do not invent examples for this list.
const CARDS = [
  { example: "Dit is mir Wurscht wie Stulle!", meaning: "eine Scheibe Brot", title: "Stulle" },
  { example: "Ditt is knorke!", meaning: "großartig, toll, Klasse", title: "Knorke" },
  {
    example: "Ick bin der Schürftse von meen Kiez!",
    meaning: "Kietz, Wohnviertel, Stadtteil",
    title: "Kiez",
  },
  { example: "meene Atze", meaning: "Bruder, Schwester, Freunde", title: "Atze" },
  { example: "Dit is dufte.", meaning: "total super, anerkennend", title: "dufte" },
];

const ratings = [
  { interval: "< 10 Min", label: "Nochmal", type: "again" },
  { interval: "1 Tag", label: "Schwer", type: "hard" },
  { interval: "3 Tage", label: "Gut", type: "good" },
  { interval: "1 Woche", label: "Einfach", type: "easy" },
];

const i = ref(0);
const flipped = ref(false);
const done = ref(0);

const card = computed(() => CARDS[i.value % CARDS.length]);
const remaining = computed(() => 20 - (done.value % 20));

function flip(): void {
  flipped.value = true;
}

function next(): void {
  i.value += 1;
  flipped.value = false;
  done.value += 1;
}
</script>

<style lang="scss">
@use "@styles/components/anki-flashcard";
</style>
