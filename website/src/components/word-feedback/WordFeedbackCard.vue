<template>
  <section class="c-word-feedback-card" aria-labelledby="word-feedback-title">
    <header class="c-word-feedback-card__header">
      <h2 id="word-feedback-title" class="c-word-feedback-card__title">Sagste det noch?</h2>
      <p v-if="feedback" class="c-word-feedback-card__count">
        {{
          totalVotes
            ? `Bisher ${totalVotes} ${totalVotes === 1 ? "Stimme" : "Stimmen"}`
            : "Noch keene Stimme"
        }}
      </p>
    </header>

    <div
      v-if="current === 'usage' || current === 'done'"
      class="c-word-feedback-card__options"
      role="group"
      aria-labelledby="word-feedback-title"
    >
      <button
        v-for="o in USAGE_OPTIONS"
        :key="o.value"
        :aria-pressed="selected.usage === o.value"
        class="c-choice"
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

    <div aria-live="polite">
      <div v-if="feedback && current !== 'usage'" class="c-word-feedback-card__bars">
        <div
          v-for="b in bars"
          :key="b.value"
          class="c-word-feedback-card__bar"
          :class="{ 'is-mine': b.value === selected.usage }"
        >
          <span class="c-word-feedback-card__bar-label">
            {{ b.label }}<template v-if="b.value === selected.usage"> · deine Antwort</template>
          </span>
          <span class="c-word-feedback-card__bar-track" aria-hidden="true">
            <span class="c-word-feedback-card__bar-fill" :style="{ inlineSize: `${b.percent}%` }" />
          </span>
          <span class="c-word-feedback-card__bar-value">{{ b.percent }} % · {{ b.text }}</span>
        </div>
      </div>
    </div>

    <!-- No live region here: the focus moves to the new question, which announces it already. -->
    <div>
      <div
        v-if="current !== 'usage' && current !== 'done'"
        :key="current"
        class="c-word-feedback-card__step"
        :class="enter"
      >
        <div class="c-word-feedback-card__progress">
          <span class="c-word-feedback-card__segments" aria-hidden="true">
            <span
              v-for="s in segments"
              :key="s.step"
              class="c-word-feedback-card__segment"
              :class="`is-${s.state}`"
            />
          </span>
          <span class="c-word-feedback-card__eyebrow">
            Schritt {{ stepIndex + 1 }} von {{ steps.length }}
          </span>
        </div>
        <h3 ref="question" class="c-word-feedback-card__question" tabindex="-1">
          {{ QUESTIONS[current] }}
        </h3>

        <div v-show="explainOpen" id="word-feedback-why" class="c-word-feedback-card__why">
          <strong>Warum so ville Fragen?</strong>
          <p>
            Weil wa hier zusammen forschen: Wie klingt det Berlinerische heute, wo wird’s noch
            jesprochen und von wem? Jede Antwort hilft uns, den Berliner Metrolekt besser zu
            verstehen – dafür brauchen wa ’n paar Angaben von dir: wo de wohnst, ob de hier
            uffjewachsen bist und wie alt de bist.
          </p>
          <p><em>Mach mit, so weit de willst – jede Frage kannste überspringen.</em></p>
        </div>
        <button
          aria-controls="word-feedback-why"
          :aria-expanded="explainOpen"
          class="c-link c-word-feedback-card__why-link"
          type="button"
          @click="explainOpen = !explainOpen"
        >
          Warum fragen wa dit?
        </button>

        <BerlinAreaMap
          v-if="current === 'area'"
          :model-value="(picked.area as Area | null) ?? null"
          @update:model-value="answerProfile('area', $event)"
        />
        <div
          v-else
          class="c-word-feedback-card__options"
          :class="`c-word-feedback-card__options--${current}`"
          role="group"
          :aria-label="QUESTIONS[current]"
        >
          <button
            v-for="o in choices"
            :key="o.value"
            :aria-pressed="picked[current] === o.value"
            class="c-choice"
            :disabled="pending"
            type="button"
            @click="answerProfile(current, o.value)"
          >
            {{ o.label }}
          </button>
        </div>

        <footer class="c-word-feedback-card__footer">
          <button
            v-if="history.length"
            class="c-link"
            :disabled="pending"
            type="button"
            @click="back"
          >
            ← Zurück
          </button>
          <button
            class="c-link c-word-feedback-card__skip"
            :disabled="pending"
            type="button"
            @click="answerProfile(current, null)"
          >
            überspringen
          </button>
        </footer>
      </div>

      <div
        v-if="current === 'done'"
        ref="doneBox"
        class="c-word-feedback-card__done"
        :class="enter"
        tabindex="-1"
      >
        <p class="c-word-feedback-card__thanks"><strong>Danke fürs Mitmachen!</strong></p>
        <ul v-if="rows.length" class="c-word-feedback-card__compare">
          <li v-for="r in rows" :key="r.label">{{ r.label }}: {{ r.share }} % sagen det</li>
        </ul>
        <button class="c-link" type="button" @click="reset">Angaben ändern</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import BerlinAreaMap from "@components/word-feedback/BerlinAreaMap.vue";
import { useStore } from "@nanostores/vue";
import {
  $feedback,
  $profile,
  loadFeedback,
  nextStep,
  answerUsage,
  sendFeedback,
  type Profile,
} from "@stores/wordFeedback.ts";
import { trackEvent } from "@utils/analytics";
import {
  AREA_LOCALITIES,
  LOCALITY_NAMES,
  type Age,
  type Area,
  type BerlinArea,
  type Half,
  type Locality,
  type Origin,
  type Usage,
} from "payload-app/word-feedback";
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from "vue";

import { BERLIN_AREAS } from "@/data/berlinAreas";

type Step = "age" | "area" | "done" | "half" | "locality" | "origin" | "usage";
type ProfileStep = "age" | "area" | "half" | "locality" | "origin";

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
  locality: "Welcher Kiez?",
  origin: "Uffjewachsen oder zujezogen?",
};
// The localities come from the chosen area, see `choices`.
const CHOICES: Record<
  Exclude<ProfileStep, "area" | "locality">,
  { label: string; value: string }[]
> = {
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

// The area whose localities are offered; null for Brandenburg, Woanders and a skipped area.
const localityArea = computed(() => {
  const a = profile.value.area;
  return a && a in AREA_LOCALITIES ? (a as BerlinArea) : null;
});
const choices = computed(() =>
  current.value === "locality"
    ? Object.entries(localityArea.value ? AREA_LOCALITIES[localityArea.value] : {}).map(
        ([value, label]) => ({
          label,
          value,
        }),
      )
    : current.value === "area"
      ? []
      : CHOICES[current.value as keyof typeof CHOICES],
);

// null = not chosen yet: derived from the loaded state, so a revisit starts in "done".
const step = ref<Step | null>(null);
const current = computed<Step>(
  () => step.value ?? (feedback.value?.mine?.usage ? "done" : "usage"),
);
// Steps the visitor went through (skipped-by-condition ones never enter), so "Zurück" jumps over them.
const history = ref<Step[]>([]);
const go = (to: Step, from: Step = current.value) => {
  history.value.push(from);
  step.value = to;
};
const explainOpen = ref(false);
const pending = ref(false);
const loadFailed = ref(false);
// The chosen answer shows at once and is taken back when the send fails.
const picked = ref<Record<string, string | null>>({});
const pickedUsage = ref<Usage | null>(null);
const selected = computed(() => ({ usage: pickedUsage.value ?? feedback.value?.mine?.usage }));

const question = useTemplateRef<HTMLElement>("question");
const doneBox = useTemplateRef<HTMLElement>("doneBox");
// Step order: decides the slide direction of the enter animation.
const ORDER: Step[] = ["usage", "area", "locality", "origin", "half", "age", "done"];
// Enter animation (CSS only, no View Transitions: nothing to coordinate with the focus move below).
// Only a user-driven step change sets it, so mount and a revisit's first paint stay still.
const enter = ref<string[]>([]);
// Only user-driven step changes move focus (the buttons that held it are gone), never mount/hydration.
watch(step, async (to, from) => {
  enter.value = [
    "is-entering",
    ...(to && from && ORDER.indexOf(to) < ORDER.indexOf(from) ? ["is-back"] : []),
  ];
  await nextTick();
  (question.value ?? doneBox.value)?.focus();
});

// Open on the first profile question, folded behind a link afterwards.
watch(current, (c) => (explainOpen.value = c === "area"), { immediate: true });

onMounted(async () => {
  await loadFeedback(props.wordId);
  loadFailed.value = !feedback.value;
});
// A later successful answer fills the state: the notice is stale then.
watch(feedback, (f) => f && (loadFailed.value = false));

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
    const ok = await answerUsage(props.wordId, usage);
    if (ok && first) {
      // `current` is already "done" here, so name the step we come from.
      go(nextStep($profile.get()), "usage");
    }
    // A failed vote must not keep showing the unsaved choice as selected.
    if (!ok) pickedUsage.value = null;
  } finally {
    pending.value = false;
  }
};

const answerProfile = async (key: ProfileStep, value: string | null) => {
  if (pending.value) return;
  pending.value = true;
  try {
    if (!(await ready())) return;
    const before = picked.value;
    picked.value = {
      ...picked.value,
      [key]: value,
      ...(key === "area" ? { locality: null } : {}),
    };
    // The API only accepts a half in the same request as origin grewUp.
    // Likewise a locality only together with its area, and a new area drops the old one.
    const hadLocality = $profile.get().locality || feedback.value?.mine?.locality;
    const patch = {
      [key]: value,
      ...(key === "origin" && value !== "grewUp" ? { half: null } : {}),
      ...(key === "half" && value ? { origin: "grewUp" } : {}),
      ...(key === "locality" && value ? { area: $profile.get().area } : {}),
      ...(key === "area" && hadLocality ? { locality: null } : {}),
    } as Parameters<typeof sendFeedback>[1];
    trackEvent("Word Feedback", key, value ?? "skip");
    if (await sendFeedback(props.wordId, patch)) {
      const next = { ...$profile.get(), ...patch } as Profile;
      // The sent null only clears the server row; for the profile the new area's locality is "not asked yet".
      if (key === "area") delete next.locality;
      $profile.set(next);
      go(nextStep($profile.get()));
    } else picked.value = before;
  } finally {
    pending.value = false;
  }
};

// "Angaben ändern" starts over, so the stored profile goes too (the vote and the thumb stay).
const reset = async () => {
  if (pending.value) return;
  pending.value = true;
  try {
    const cleared = { age: null, area: null, half: null, locality: null, origin: null };
    if (!(await sendFeedback(props.wordId, cleared))) return;
  } finally {
    pending.value = false;
  }
  $profile.set({});
  picked.value = {};
  history.value = [];
  step.value = "area";
};

// Going back to the vote withdraws it, so the first step starts clean again.
const back = async () => {
  const prev = history.value[history.value.length - 1];
  if (!prev || pending.value) return;
  if (prev === "usage") {
    pending.value = true;
    try {
      if (!(await sendFeedback(props.wordId, { usage: null }))) return;
      pickedUsage.value = null;
    } finally {
      pending.value = false;
    }
  }
  history.value.pop();
  step.value = prev;
};

const steps = computed(() => [
  "usage",
  "area",
  ...(localityArea.value || current.value === "locality" ? ["locality"] : []),
  "origin",
  ...(profile.value.origin === "grewUp" || current.value === "half" ? ["half"] : []),
  "age",
]);
const stepIndex = computed(() => Math.max(0, steps.value.indexOf(current.value)));

// Always six segments, so the bar does not jump when the optional steps come or go.
const ALL_STEPS = ["usage", "area", "locality", "origin", "half", "age"];
const segments = computed(() => {
  const at = ALL_STEPS.indexOf(current.value);
  return ALL_STEPS.map((s, i) => {
    if (!steps.value.includes(s)) return { state: "skipped", step: s };
    if (current.value === "done" || i < at) return { state: "done", step: s };
    return { state: i === at ? "current" : "open", step: s };
  });
});

const totalVotes = computed(() => {
  const t = feedback.value?.totals;
  return t ? t.say + t.know + t.never : 0;
});

const bars = computed(() => {
  const t = feedback.value?.totals;
  const total = totalVotes.value;
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
const localityName = computed(() => {
  const key: Locality | null | undefined = feedback.value?.mine?.locality ?? profile.value.locality;
  return key ? LOCALITY_NAMES[key] : null;
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
    { label: `in ${localityName.value}`, share: localityName.value ? c.locality : null },
  ].filter((r): r is { label: string; share: number } => r.share !== null);
});
</script>

<style lang="scss">
@use "@styles/components/word-feedback-card";
</style>
