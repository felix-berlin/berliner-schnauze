<template>
  <div class="c-anki-flashcard">
    <div class="stack">
      <div class="paper back"></div>
      <div class="paper front"></div>
      <div class="card">
        <div class="head">
          <span>Berliner Schnauze ᛫ Anki</span>
          <span>Noch {{ remaining }} heute</span>
        </div>
        <div class="body">
          <div class="word">{{ card.title }}</div>
          <div v-if="flipped" class="answer">
            <div class="meaning">{{ card.meaning }}</div>
            <div v-if="card.example" class="example">„{{ card.example }}“</div>
          </div>
        </div>
        <div v-if="!flipped" class="foot">
          <button type="button" class="c-button" data-variant="paper center-icon" @click="flip">
            Antwort zeigen
          </button>
        </div>
        <div v-else class="ratings">
          <button
            v-for="r in ratings"
            :key="r.label"
            type="button"
            class="rating"
            :data-kind="r.type"
            @click="rate(r.type)"
          >
            <span class="interval">{{ r.interval }}</span>
            <span class="label">{{ r.label }}</span>
          </button>
        </div>
      </div>
    </div>
    <p class="hint">
      Probier's aus: Karte aufdecken, ehrlich bewerten.<br />
      Mehr zu <a :href="card.href" data-track="Click Word Link|anki-demo">„{{ card.title }}“</a> im
      Wörterbuch.
    </p>
  </div>
</template>

<script setup lang="ts">
import { trackEvent } from "@utils/analytics";
import { ref, computed } from "vue";

const props = defineProps<{
  cards: { example: string; href: string; meaning: string; title: string }[];
}>();

const ratings = [
  { interval: "< 10 Min", label: "Nochmal", type: "again" },
  { interval: "1 Tag", label: "Schwer", type: "hard" },
  { interval: "3 Tage", label: "Gut", type: "good" },
  { interval: "1 Woche", label: "Einfach", type: "easy" },
];

const i = ref(0);
const flipped = ref(false);

const card = computed(() => props.cards[i.value % props.cards.length]);
const remaining = computed(() => 20 - (i.value % 20));

function flip(): void {
  flipped.value = true;
  trackEvent("Anki", "Demo Flip", "anki-demo");
}

function rate(type: string): void {
  trackEvent("Anki", "Demo Rate", type);
  i.value += 1;
  flipped.value = false;
}
</script>

<style lang="scss">
@use "@styles/components/anki-flashcard";
</style>
