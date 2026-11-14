<template>
  <section
    class="c-section-card c-word-feedback-card"
    data-variant="unnumbered word"
    aria-labelledby="word-feedback-title"
  >
    <div class="header">
      <span class="num" />
      <h2 id="word-feedback-title" class="title">Sagste det noch?</h2>
      <span v-if="feedback" class="count">
        {{
          totalVotes
            ? `Bisher ${totalVotes} ${totalVotes === 1 ? "Stimme" : "Stimmen"}`
            : "Noch keene Stimme"
        }}
      </span>
    </div>

    <div class="body">
      <div class="poll">
        <!-- Persistent, so the announcement works although the card swaps its content. -->
        <p class="u-sr-only" role="status">{{ announcement }}</p>
        <template v-if="current === 'usage'">
          <p ref="lead" class="lead" tabindex="-1">Is dit Wort bei dir noch im Einsatz?</p>
          <div
            v-if="!online"
            id="word-feedback-offline"
            class="c-state"
            data-variant="offline"
            role="status"
          >
            <WifiOff aria-hidden="true" height="18" width="18" />
            <span class="body">
              <b>Du bist offline.</b>
              <span>Abstimmen jeht wieder, sobald du Netz hast.</span>
            </span>
          </div>
          <div v-if="failed" class="c-state" data-variant="error" role="alert">
            <CircleAlert aria-hidden="true" height="18" width="18" />
            <span class="body">
              <b>Ditt hat nich jeklappt.</b>
              <span>
                {{
                  (failed.usage && sendError) ||
                  (failed.usage
                    ? "Deine Stimme is nich anjekommen."
                    : "Die Stimmen sind nich anjekommen.")
                }}
                <button
                  :aria-describedby="!online ? 'word-feedback-offline' : undefined"
                  :aria-disabled="pending || !online"
                  class="c-textlink"
                  data-variant="inline"
                  type="button"
                  @click="retry"
                >
                  Nochmal versuchen
                </button>
              </span>
            </span>
          </div>
          <div class="tiles" role="group" aria-labelledby="word-feedback-title">
            <button
              v-for="o in USAGE_OPTIONS"
              :key="o.value"
              :aria-disabled="!online || pending"
              :aria-pressed="pickedUsage === o.value"
              class="c-choice"
              data-variant="tile"
              type="button"
              @click="answerUsageStep(o.value)"
            >
              <span class="icon" aria-hidden="true">
                <component :is="o.icon" height="22" width="22" />
              </span>
              <span class="text">
                <b>{{ o.label }}</b>
                <span>{{ o.hint }}</span>
              </span>
            </button>
          </div>
          <p class="teaser">
            {{
              totalVotes
                ? `Schon ${totalVotes} ${totalVotes === 1 ? "Stimme" : "Stimmen"} – wat sagst du?`
                : "Noch keener hat abjestimmt – mach den Anfang!"
            }}
          </p>
        </template>

        <template v-else>
          <div aria-live="polite">
            <div v-if="feedback" class="bars">
              <div
                v-for="b in bars"
                :key="b.value"
                class="bar"
                :data-state="b.value === selected.usage ? 'mine' : undefined"
              >
                <span class="bar-label">
                  {{ b.label
                  }}<template v-if="b.value === selected.usage"> · deine Antwort</template>
                </span>
                <span class="bar-value">{{ b.percent }} % · {{ b.text }}</span>
                <span class="bar-track" aria-hidden="true">
                  <span class="bar-fill" :style="{ inlineSize: `${b.percent}%` }" />
                </span>
              </div>
            </div>
          </div>

          <div v-if="current !== 'done'" :key="current" class="step" :data-enter="enter">
            <span
              class="segments"
              role="img"
              :aria-label="`Schritt ${stepIndex + 1} von ${steps.length}`"
            >
              <span v-for="s in segments" :key="s.step" class="segment" :data-state="s.state" />
            </span>
            <div class="progress">
              <h3 ref="question" class="question" tabindex="-1">
                {{ QUESTIONS[current] }}
              </h3>
              <span class="eyebrow" aria-hidden="true">
                Schritt {{ stepIndex + 1 }} von {{ steps.length }}
              </span>
            </div>

            <div v-show="explainOpen" id="word-feedback-why" class="c-infotext">
              <div class="c-word-feedback-why">
                <b>Warum so ville Fragen?</b>
                <span>
                  Weil wa hier zusammen forschen: Wie klingt det Berlinerische heute, wo wird’s noch
                  jesprochen und von wem? Jede Antwort hilft uns, den Berliner Metrolekt besser zu
                  verstehen – dafür brauchen wa ’n paar Angaben von dir: wo de wohnst, ob de hier
                  uffjewachsen bist und wie alt de bist.
                </span>
                <span class="note">
                  Mach mit, so weit de willst – jede Frage kannste überspringen.
                </span>
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
              @update:model-value="answerProfile('area', $event)"
            />
            <div
              v-else
              class="options"
              :data-kind="current"
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
          </div>

          <div v-else ref="doneBox" class="done" :data-enter="enter" tabindex="-1">
            <p class="done-title"><strong>Danke fürs Mitmachen!</strong></p>
            <ul v-if="rows.length" class="compare">
              <li v-for="r in rows" :key="r.label">{{ r.label }}: {{ r.share }} % sagen det</li>
            </ul>
            <button class="c-textlink" type="button" @click="reset">Angaben ändern</button>
            <button class="c-textlink" :disabled="pending" type="button" @click="withdraw">
              Stimme zurückziehen
            </button>
          </div>

          <div class="privacy">
            <label class="remember">
              <input
                type="checkbox"
                :checked="remember"
                @change="setRemember(($event.target as HTMLInputElement).checked)"
              />
              Meine Angaben für weitere Wörter merken (nur in diesem Browser)
            </label>
            <p>
              Wir speichern Deine Antworten ohne Namen, aber mit einer Kennung aus einem Cookie (<a
                href="/datenschutz#7-wort-feedback"
                >Datenschutz</a
              >).
              <button class="c-textlink" :disabled="pending" type="button" @click="deleteAll">
                Alle meine Antworten löschen
              </button>
            </p>
          </div>
        </template>
      </div>
    </div>

    <footer v-if="current !== 'usage' && current !== 'done'" class="steps-nav">
      <button class="c-textlink" :disabled="pending" type="button" @click="back">← Zurück</button>
      <button
        class="c-textlink"
        :disabled="pending"
        type="button"
        @click="answerProfile(current, null)"
      >
        überspringen
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import BerlinAreaMap from "@components/word-feedback/BerlinAreaMap.vue";
import { useStore } from "@nanostores/vue";
import {
  $feedback,
  $profile,
  $sendError,
  loadFeedback,
  nextStep,
  answerUsage,
  deleteAllFeedback,
  sendFeedback,
  setRemember,
  $remember,
  type Profile,
} from "@stores/wordFeedback.ts";
import { trackEvent } from "@utils/analytics";
import { useOnline } from "@vueuse/core";
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
import CircleAlert from "virtual:icons/lucide/circle-alert";
import CircleQuestionMark from "virtual:icons/lucide/circle-question-mark";
import Ear from "virtual:icons/lucide/ear";
import MessageCircleMore from "virtual:icons/lucide/message-circle-more";
import WifiOff from "virtual:icons/lucide/wifi-off";
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from "vue";

import { BERLIN_AREAS } from "@/data/berlinAreas";

type Step = "age" | "area" | "done" | "half" | "locality" | "origin" | "usage";
type ProfileStep = "age" | "area" | "half" | "locality" | "origin";

const props = defineProps<{ wordId: number }>();

const USAGE_OPTIONS = [
  {
    hint: "Kommt mir regelmäßig übern Mund",
    icon: MessageCircleMore,
    label: "Sag ick selbst",
    value: "say",
  },
  { hint: "Hab ick schon mal jehört", icon: Ear, label: "Kenn ick", value: "know" },
  { hint: "Is mir janz neu", icon: CircleQuestionMark, label: "Nie jehört", value: "never" },
] as const;
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

const online = useOnline();
const feedback = useStore($feedback);
const sendError = useStore($sendError);
const profile = useStore($profile);
const remember = useStore($remember);

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

// Someone with a stored profile does not see the questions again (Spec §10).
const hasProfile = computed(() => {
  const m = feedback.value?.mine;
  return !!(m?.area || m?.locality || m?.origin || m?.half || m?.age);
});
// null = not chosen yet: derived from the loaded state, so a revisit starts on the first open question or in "done".
const step = ref<Step | null>(null);
const current = computed<Step>(
  () =>
    step.value ??
    (feedback.value?.mine?.usage
      ? hasProfile.value
        ? "done"
        : nextStep($profile.value)
      : "usage"),
);
// Steps the visitor went through (skipped-by-condition ones never enter), so "Zurück" jumps over them.
const history = ref<Step[]>([]);
const go = (to: Step, from: Step = current.value) => {
  history.value.push(from);
  step.value = to;
};
const explainOpen = ref(false);
// Live region text after a vote (the focus moves to the first question, which does not say the vote counted).
const announcement = ref("");
const pending = ref(false);
const loadFailed = ref(false);
// The vote that did not arrive: "Nochmal versuchen" sends this very answer again.
const failedUsage = ref<Usage | null>(null);
const failed = computed(() =>
  failedUsage.value || loadFailed.value ? { usage: failedUsage.value } : null,
);
// The chosen answer shows at once and is taken back when the send fails.
const picked = ref<Record<string, string | null>>({});
const pickedUsage = ref<Usage | null>(null);
const selected = computed(() => ({ usage: pickedUsage.value ?? feedback.value?.mine?.usage }));

const lead = useTemplateRef<HTMLElement>("lead");
const question = useTemplateRef<HTMLElement>("question");
const doneBox = useTemplateRef<HTMLElement>("doneBox");
// Step order: decides the slide direction of the enter animation.
const ORDER: Step[] = ["usage", "area", "locality", "origin", "half", "age", "done"];
// Enter animation (CSS only, no View Transitions: nothing to coordinate with the focus move below).
// Only a user-driven step change sets it, so mount and a revisit's first paint stay still.
const enter = ref<"back" | "forward">();
// Only user-driven step changes move focus (the buttons that held it are gone), never mount/hydration.
watch(step, async (to, from) => {
  enter.value = to && from && ORDER.indexOf(to) < ORDER.indexOf(from) ? "back" : "forward";
  if (to === "usage") announcement.value = "";
  await nextTick();
  (question.value ?? doneBox.value ?? lead.value)?.focus();
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
  if (pending.value || !online.value) return;
  // failedUsage stays set until the result: the alert holds the focused retry button and must not unmount meanwhile.
  pending.value = true;
  try {
    if (!(await ready())) {
      $sendError.set(null); // a stale server reason belongs to an older vote
      failedUsage.value = usage;
      return;
    }
    pickedUsage.value = usage;
    // The store's update turns the derived step into "done" before this call returns.
    const first = current.value === "usage";
    trackEvent("Word Feedback", "usage", usage);
    // silent: the inline alert is the one channel for a failed vote, the store must not toast it too.
    const ok = await answerUsage(props.wordId, usage, true);
    if (ok) failedUsage.value = null;
    if (ok) announcement.value = "Stimme jezählt";
    if (ok && first) {
      // `current` has moved on already here, so name the step we come from.
      go(nextStep($profile.get()), "usage");
    }
    // A failed vote must not keep showing the unsaved choice as selected.
    if (!ok) {
      pickedUsage.value = null;
      failedUsage.value = usage;
    }
  } finally {
    pending.value = false;
  }
};

// aria-disabled keeps focus on the button, so a locked retry has to be ignored here (offline: the banner says why).
const retry = () => {
  if (pending.value || !online.value) return;
  return failedUsage.value ? answerUsageStep(failedUsage.value) : ready();
};

const answerProfile = async (key: ProfileStep, value: string | null) => {
  if (pending.value) return;
  pending.value = true;
  try {
    if (!(await ready())) return;
    const before = picked.value;
    const dropsHalf = key === "area" && (value === "brandenburg" || value === "elsewhere");
    picked.value = {
      ...picked.value,
      [key]: value,
      ...(key === "area" ? { locality: null } : {}),
      ...(dropsHalf ? { half: null } : {}),
    };
    // The API only accepts a half in the same request as origin grewUp.
    // Likewise a locality only together with its area, and a new area drops the old one.
    const hadLocality = $profile.get().locality || feedback.value?.mine?.locality;
    const patch = {
      [key]: value,
      ...(key === "origin" && value !== "grewUp" ? { half: null } : {}),
      // Woanders/Brandenburg skip the half step: a half answered before "Zurück" must go too.
      ...(dropsHalf ? { half: null } : {}),
      ...(key === "half" && value ? { origin: "grewUp" } : {}),
      ...(key === "locality" && value ? { area: $profile.get().area } : {}),
      ...(key === "area" && hadLocality ? { locality: null } : {}),
    } as Parameters<typeof sendFeedback>[1];
    if (await sendFeedback(props.wordId, patch)) {
      const next = { ...$profile.get(), ...patch } as Profile;
      // The sent null only clears the server row; for the profile the new area's locality is "not asked yet".
      if (key === "area") delete next.locality;
      // Same for the half a new area drops: a null key would make nextStep skip the question for good.
      if (dropsHalf) delete next.half;
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

// Takes the vote back after a reload too (the "Zurück" path only exists in the same run).
const withdraw = async () => {
  if (pending.value) return;
  pending.value = true;
  try {
    if (!(await sendFeedback(props.wordId, { usage: null }))) return;
  } finally {
    pending.value = false;
  }
  pickedUsage.value = null;
  history.value = [];
  step.value = null;
};

const deleteAll = async () => {
  if (pending.value || !window.confirm("Alle Deine Antworten zu allen Wörtern löschen?")) return;
  pending.value = true;
  try {
    if (!(await deleteAllFeedback(props.wordId))) return;
  } finally {
    pending.value = false;
  }
  picked.value = {};
  pickedUsage.value = null;
  history.value = [];
  step.value = null;
};

// Without history (after a reload) the way back is the vote; the stored vote stays until a new one replaces it.
const back = () => {
  if (pending.value) return;
  step.value = history.value.pop() ?? "usage";
};

const woanders = computed(
  () => profile.value.area === "brandenburg" || profile.value.area === "elsewhere",
);
const steps = computed(() => [
  "usage",
  "area",
  ...(localityArea.value || current.value === "locality" ? ["locality"] : []),
  "origin",
  ...((profile.value.origin === "grewUp" && !woanders.value) || current.value === "half"
    ? ["half"]
    : []),
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
@use "@styles/components/word-feedback-why";
</style>
