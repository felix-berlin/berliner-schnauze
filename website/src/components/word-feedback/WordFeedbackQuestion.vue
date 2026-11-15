<template>
  <div class="step" :data-enter="enter">
    <span class="segments" role="img" :aria-label="`Schritt ${stepIndex + 1} von ${stepCount}`">
      <span v-for="s in segments" :key="s.step" class="segment" :data-state="s.state" />
    </span>
    <div class="progress">
      <h3 class="question" data-autofocus tabindex="-1">{{ QUESTIONS[current] }}</h3>
      <span class="eyebrow" aria-hidden="true"
        >Schritt {{ stepIndex + 1 }} von {{ stepCount }}</span
      >
    </div>

    <div v-show="explainOpen" id="word-feedback-why" class="c-infotext">
      <div class="c-word-feedback-why">
        <b>Warum so ville Fragen?</b>
        <span>
          Weil wa hier zusammen forschen: Wie klingt det Berlinerische heute, wo wird’s noch
          jesprochen und von wem? Jede Antwort hilft uns, den Berliner Metrolekt besser zu verstehen
          – dafür brauchen wa ’n paar Angaben von dir: wo de wohnst, ob de hier uffjewachsen bist
          und wie alt de bist.
        </span>
        <span class="note"> Mach mit, so weit de willst – jede Frage kannste überspringen. </span>
      </div>
    </div>
    <div class="why-toggle">
      <button
        aria-controls="word-feedback-why"
        :aria-expanded="explainOpen"
        class="c-textlink"
        type="button"
        @click="explainOpen = !explainOpen"
      >
        Warum fragen wa dit?
      </button>
    </div>

    <BerlinAreaMap
      v-if="current === 'area'"
      :model-value="(picked.area as Area | null) ?? null"
      @update:model-value="emit('answer', 'area', $event)"
    />
    <div v-else class="options" :data-kind="current" role="group" :aria-label="QUESTIONS[current]">
      <button
        v-for="o in choices"
        :key="o.value"
        :aria-pressed="picked[current] === o.value"
        class="c-choice"
        :disabled="pending"
        type="button"
        @click="emit('answer', current, o.value)"
      >
        {{ o.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Area } from "payload-app/word-feedback";

import BerlinAreaMap from "@components/word-feedback/BerlinAreaMap.vue";
import { QUESTIONS, type ProfileStep } from "@utils/wordFeedbackView";
import { ref } from "vue";

// One profile question. The card keys it by step, so each question starts closed (the first one open) and fresh.
const props = defineProps<{
  choices: { label: string; value: string }[];
  current: ProfileStep;
  enter: "back" | "forward" | undefined;
  pending: boolean;
  picked: Record<string, string | null>;
  segments: { state: string; step: string }[];
  stepCount: number;
  stepIndex: number;
}>();
const emit = defineEmits<{ answer: [key: ProfileStep, value: string | null] }>();

// Open on the first profile question, folded behind a link afterwards.
const explainOpen = ref(props.current === "area");
</script>
