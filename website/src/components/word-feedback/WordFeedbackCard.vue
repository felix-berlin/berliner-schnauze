<template>
  <section class="c-word-feedback-card" aria-labelledby="word-feedback-title">
    <h2 id="word-feedback-title" class="c-word-feedback-card__title">Sagste det noch?</h2>

    <div v-if="current === 'usage' || current === 'done'" class="c-word-feedback-card__options">
      <button
        v-for="o in USAGE_OPTIONS"
        :key="o.value"
        :aria-pressed="selected.usage === o.value"
        class="c-word-feedback-card__option"
        :class="{ 'is-selected': selected.usage === o.value }"
        :disabled="pending"
        type="button"
        @click="answerUsageStep(o.value)"
      >
        {{ o.label }}
      </button>
    </div>

    <p v-if="loadFailed" class="c-word-feedback-card__error" role="alert">
      Hat nich jeklappt, versuch's nochma.
    </p>

    <div v-if="feedback && current !== 'usage'" class="c-word-feedback-card__bars">
      <div v-for="b in bars" :key="b.value" class="c-word-feedback-card__bar">
        <span class="c-word-feedback-card__bar-label">{{ b.label }}</span>
        <span class="c-word-feedback-card__bar-track" aria-hidden="true">
          <span class="c-word-feedback-card__bar-fill" :style="{ inlineSize: `${b.percent}%` }" />
        </span>
        <span class="c-word-feedback-card__bar-value">{{ b.percent }} % · {{ b.text }}</span>
      </div>
    </div>

    <div v-if="current !== 'usage' && current !== 'done'" class="c-word-feedback-card__step">
      <div
        class="c-word-feedback-card__dots"
        role="img"
        :aria-label="`Schritt ${dotIndex + 1} von ${dots.length}`"
      >
        <span
          v-for="(d, i) in dots"
          :key="d"
          class="c-word-feedback-card__dot"
          :class="{ 'is-active': i <= dotIndex }"
        />
      </div>
      <h3 class="c-word-feedback-card__question">{{ QUESTIONS[current] }}</h3>

      <BerlinAreaMap
        v-if="current === 'area'"
        :model-value="(picked.area as Area | null) ?? null"
        @update:model-value="answerProfile('area', $event)"
      />
      <div v-else class="c-word-feedback-card__options">
        <button
          v-for="o in CHOICES[current]"
          :key="o.value"
          :aria-pressed="picked[current] === o.value"
          class="c-word-feedback-card__option"
          :class="{ 'is-selected': picked[current] === o.value }"
          :disabled="pending"
          type="button"
          @click="answerProfile(current, o.value)"
        >
          {{ o.label }}
        </button>
      </div>
      <button
        class="c-word-feedback-card__skip"
        :disabled="pending"
        type="button"
        @click="answerProfile(current, null)"
      >
        überspringen
      </button>
    </div>

    <div v-if="current === 'done'" class="c-word-feedback-card__done">
      <ul v-if="rows.length" class="c-word-feedback-card__compare">
        <li v-for="r in rows" :key="r.label">{{ r.label }}: {{ r.share }} % sagen det</li>
      </ul>
      <button class="c-word-feedback-card__skip" type="button" @click="reset">
        Angaben ändern
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Age, Area, Half, Origin, Usage } from "payload-app/word-feedback";

import BerlinAreaMap from "@components/word-feedback/BerlinAreaMap.vue";
import { useStore } from "@nanostores/vue";
import {
  $feedback,
  $profile,
  loadFeedback,
  nextStep,
  sendFeedback,
  type Profile,
} from "@stores/wordFeedback.ts";
import { trackEvent } from "@utils/analytics";
import { computed, onMounted, ref } from "vue";

import { BERLIN_AREAS } from "@/data/berlinAreas";

type Step = "age" | "area" | "done" | "half" | "origin" | "usage";
type ProfileStep = "age" | "area" | "half" | "origin";

const props = defineProps<{ wordId: number }>();

const USAGE_OPTIONS: { label: string; value: Usage }[] = [
  { label: "Sag ick selbst", value: "say" },
  { label: "Kenn ick", value: "know" },
  { label: "Nie jehört", value: "never" },
];
const QUESTIONS = {
  age: "Wie alt biste?",
  area: "Wo wohnste?",
  half: "In welcher Hälfte?",
  origin: "Uffjewachsen oder zujezogen?",
};
const CHOICES: Record<Exclude<ProfileStep, "area">, { label: string; value: string }[]> = {
  age: [
    { label: "unter 20", value: "u20" },
    { label: "20–29", value: "20-29" },
    { label: "30–39", value: "30-39" },
    { label: "40–49", value: "40-49" },
    { label: "50–59", value: "50-59" },
    { label: "60–69", value: "60-69" },
    { label: "70–79", value: "70-79" },
    { label: "80+", value: "80plus" },
  ],
  half: [
    { label: "Ost", value: "east" },
    { label: "West", value: "west" },
    { label: "Beides / nach der Wende", value: "both" },
  ],
  origin: [
    { label: "Hier uffjewachsen", value: "grewUp" },
    { label: "Zujezogen, über 10 Jahre her", value: "movedOver10" },
    { label: "Zujezogen, unter 10 Jahren", value: "movedUnder10" },
  ],
};

const feedback = useStore($feedback);
const profile = useStore($profile);

// null = not chosen yet: derived from the loaded state, so a revisit starts in "done".
const step = ref<Step | null>(null);
const current = computed<Step>(
  () => step.value ?? (feedback.value?.mine?.usage ? "done" : "usage"),
);
const pending = ref(false);
const loadFailed = ref(false);
// Answers that stay selected locally when the send failed.
const picked = ref<Record<string, string | null>>({});
const pickedUsage = ref<Usage | null>(null);
const selected = computed(() => ({ usage: pickedUsage.value ?? feedback.value?.mine?.usage }));

onMounted(() => loadFeedback(props.wordId));

// A failed GET left no state: retry it first, or sendFeedback would not store the answer.
const ready = async () => {
  if (!feedback.value) await loadFeedback(props.wordId);
  loadFailed.value = !feedback.value;
  return !loadFailed.value;
};

const answerUsageStep = async (usage: Usage) => {
  if (pending.value) return;
  pending.value = true;
  try {
    if (!(await ready())) return;
    pickedUsage.value = usage;
    // The store's update turns the derived step into "done" before this call returns.
    const first = current.value === "usage";
    trackEvent("Word Feedback", "usage", usage);
    const ok = await sendFeedback(props.wordId, { usage });
    if (ok && first) step.value = nextStep($profile.get());
  } finally {
    pending.value = false;
  }
};

const answerProfile = async (key: ProfileStep, value: string | null) => {
  if (pending.value) return;
  pending.value = true;
  try {
    if (!(await ready())) return;
    picked.value = { ...picked.value, [key]: value };
    // The API only accepts a half in the same request as origin grewUp.
    const patch = {
      [key]: value,
      ...(key === "origin" && value !== "grewUp" ? { half: null } : {}),
      ...(key === "half" && value ? { origin: "grewUp" } : {}),
    } as Partial<Record<ProfileStep, Age | Area | Half | Origin | null>>;
    trackEvent("Word Feedback", key, value ?? "skip");
    if (await sendFeedback(props.wordId, patch)) {
      $profile.set({ ...$profile.get(), ...patch } as Profile);
      step.value = nextStep($profile.get());
    }
  } finally {
    pending.value = false;
  }
};

const reset = () => {
  $profile.set({});
  picked.value = {};
  step.value = "area";
};

const dots = computed(() =>
  profile.value.origin === "grewUp" || current.value === "half"
    ? ["usage", "area", "origin", "half", "age"]
    : ["usage", "area", "origin", "age"],
);
const dotIndex = computed(() => Math.max(0, dots.value.indexOf(current.value)));

const bars = computed(() => {
  const t = feedback.value?.totals;
  const total = t ? t.say + t.know + t.never : 0;
  return USAGE_OPTIONS.map((o) => {
    const n = t?.[o.value] ?? 0;
    return {
      label: o.label,
      percent: total ? Math.round((n / total) * 100) : 0,
      text: `${n} ${n === 1 ? "Stimme" : "Stimmen"}`,
      value: o.value,
    };
  });
});

const areaName = computed(() => {
  const key = feedback.value?.mine?.area ?? profile.value.area;
  if (!key || key === "elsewhere") return null;
  return key === "brandenburg" ? "Brandenburg" : BERLIN_AREAS.find((a) => a.key === key)?.name;
});

// Groups below the minimum size come back as null and get no row.
const rows = computed(() => {
  const c = feedback.value?.compare;
  if (!c) return [];
  return [
    { label: "Ost-Berliner", share: c.east },
    { label: "West-Berliner", share: c.west },
    { label: "Zujezogene", share: c.moved },
    { label: `in ${areaName.value}`, share: areaName.value ? c.area : null },
  ].filter((r): r is { label: string; share: number } => r.share !== null);
});
</script>

<style lang="scss">
@use "@styles/components/word-feedback-card";
</style>
