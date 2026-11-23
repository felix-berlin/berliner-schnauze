<template>
  <section
    ref="root"
    class="c-section-card c-word-poll"
    data-variant="sheet v18"
    aria-labelledby="word-poll-title"
  >
    <div class="header">
      <h3 id="word-poll-title" class="title">Sagste det noch?</h3>
      <span class="count">{{ total ? plural(total) : "Noch keene Stimme" }}</span>
    </div>

    <div class="body" role="group" aria-label="Sagste det noch?" :aria-busy="pending">
      <!-- Persistent live regions: their content comes and goes, the elements stay. -->
      <div ref="notice" class="notice u-sr-only-empty" role="status" tabindex="-1">
        <div v-if="!online" id="word-poll-offline" class="c-state" data-variant="offline">
          <WifiOff aria-hidden="true" height="18" width="18" />
          <span class="body">{{ OFFLINE_HINT }}</span>
        </div>
        <div v-if="deleted && current === 'vote'" class="c-state" data-variant="done">
          <span class="body">
            <b>Jelöscht.</b>
            <span>Deine Stimme und deine Angaben sind weg. Du kannst jederzeit neu abstimmen.</span>
          </span>
        </div>
        <div v-if="thanks && current === 'questions'" class="c-state" data-variant="success">
          <span class="body">
            <b>Danke, deine Stimme is drin!</b>
            <span
              >Noch 5 kurze Fragen, wenn de magst. Dit hilft mir, Berlinerisch zu erforschen.</span
            >
          </span>
        </div>
      </div>
      <div class="notice u-sr-only-empty" role="alert">
        <div v-if="voteFailed" class="c-state" data-variant="error">
          <CircleAlert aria-hidden="true" height="18" width="18" />
          <span class="body">
            <b>Ditt hat nich jeklappt.</b>
            <span>
              {{ sendError || "Deine Stimme is nich anjekommen." }}
              <button
                :aria-describedby="online ? undefined : 'word-poll-offline'"
                :aria-disabled="pending || !online"
                class="c-link"
                data-variant="inline"
                type="button"
                @click="retry"
              >
                Nochmal versuchen
              </button>
            </span>
          </span>
        </div>
        <div v-if="answerFailed" class="c-state" data-variant="error">
          <CircleAlert aria-hidden="true" height="18" width="18" />
          <span class="body">
            <b>Ditt hat nich jeklappt.</b>
            <span>{{
              sendError || "Deine Antwort is nich anjekommen. Versuch’s gleich nochmal."
            }}</span>
          </span>
        </div>
      </div>

      <!-- A: vote -->
      <template v-if="current === 'vote'">
        <p class="lead">Is dit Wort bei dir noch im Einsatz?</p>
        <div class="tiles">
          <button
            v-for="o in USAGE_OPTIONS"
            :key="o.value"
            :aria-describedby="online ? undefined : 'word-poll-offline'"
            :aria-disabled="!online || pending"
            :aria-pressed="pendingUsage === o.value"
            class="c-choice"
            data-variant="tile"
            type="button"
            @click="vote(o.value)"
          >
            <span class="icon" aria-hidden="true"
              ><component :is="o.icon" height="22" width="22"
            /></span>
            <span class="text">
              <b>{{ o.label }}</b>
              <span>{{ o.hint }}</span>
            </span>
          </button>
        </div>
        <p class="teaser">
          {{
            total
              ? `Schon ${plural(total)} – wat sagst du? Dit Ergebnis siehste danach.`
              : "Noch keener hat abjestimmt – mach den Anfang!"
          }}
        </p>
      </template>

      <!-- B: questions -->
      <div v-else-if="current === 'questions'" :key="step" class="step" :data-enter="enter">
        <span
          class="segments"
          role="img"
          :aria-label="`Schritt ${stepIndex + 1} von ${steps.length}`"
        >
          <span v-for="s in segments" :key="s.step" class="segment" :data-state="s.state" />
        </span>
        <div class="progress">
          <h4 class="question" data-autofocus tabindex="-1">{{ QUESTIONS[step] }}</h4>
          <span class="c-word-label" aria-hidden="true"
            >Schritt {{ stepIndex + 1 }} von {{ steps.length }}</span
          >
        </div>

        <div v-show="explainOpen" id="word-poll-why" class="why">
          <b>Warum so ville Fragen?</b>
          <span>
            Weil ick hier forsche: Wie klingt det Berlinerische heute, wo wird’s noch jesprochen und
            von wem? Jede Antwort hilft mir, den Berliner Metrolekt besser zu verstehen. Dafür
            brauch ick ’n paar Angaben von dir: wo de wohnst, ob de hier uffjewachsen bist und wie
            alt de bist.
          </span>
          <span class="note">
            Mach mit, so weit de willst. Jede Frage kannste überspringen, und allet bleibt anonym.
          </span>
        </div>
        <div v-if="step !== 'area'" class="why-toggle">
          <button
            aria-controls="word-poll-why"
            :aria-expanded="explainOpen"
            class="c-link"
            type="button"
            @click="explainOpen = !explainOpen"
          >
            Warum frag ick dit?
          </button>
        </div>

        <BerlinAreaMap
          v-if="step === 'area'"
          :model-value="(answers.area as Area | null | undefined) ?? null"
          @update:model-value="answer('area', $event)"
        />
        <div v-else class="options" :data-kind="step" role="group" :aria-label="QUESTIONS[step]">
          <button
            v-for="o in choices"
            :key="o.value"
            :aria-describedby="online ? undefined : 'word-poll-offline'"
            :aria-disabled="pending || !online"
            :aria-pressed="answers[step] === o.value"
            class="c-choice"
            type="button"
            @click="answer(step, o.value)"
          >
            {{ o.label }}
          </button>
        </div>

        <div class="nav">
          <button
            v-if="stepIndex > 1"
            class="c-link"
            :aria-disabled="pending"
            type="button"
            @click="back"
          >
            ← Zurück
          </button>
          <span class="spacer" />
          <button class="c-link" :aria-disabled="pending" type="button" @click="skip">
            überspringen
          </button>
          <button
            :aria-busy="pending"
            :aria-disabled="pending"
            class="c-button res"
            data-variant="outline"
            type="button"
            @click="showResult"
          >
            Ergebnis zeigen <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <!-- C: result -->
      <div v-else class="result" :aria-busy="refreshing">
        <div class="columns">
          <div class="all">
            <h4 class="h" data-autofocus tabindex="-1">Wat sagen alle?</h4>
            <div class="matrix" data-matrix aria-hidden="true">
              <span
                v-for="(u, i) in result.matrix"
                :key="i"
                class="dot"
                :data-usage="u"
                :data-own="i === ownIndex ? 'true' : undefined"
                :style="{ '--i': i }"
              />
            </div>
            <ul class="legend">
              <li v-for="o in USAGE_OPTIONS" :key="o.value">
                <span class="swatch" aria-hidden="true" :data-usage="o.value" />
                <span class="name">
                  {{ o.label }}
                  <span v-if="own === o.value" class="mine">deine Stimme</span>
                </span>
                <span class="pct">{{ share(o.value) }} %</span>
              </li>
            </ul>
          </div>

          <div v-if="regions.length || ages.length" class="who">
            <h4 class="h">Wer sagt’s noch?</h4>
            <template v-for="g in groups" :key="g.id">
              <p v-if="g.rows.length" :id="`word-poll-${g.id}`" class="c-word-label">
                {{ g.label }}
              </p>
              <ul
                v-if="g.rows.length"
                class="rows"
                :data-group="g.id"
                :aria-labelledby="`word-poll-${g.id}`"
              >
                <li v-for="r in g.rows" :key="r.key">
                  <span class="name">{{ r.label }}</span>
                  <span class="dots" data-dots aria-hidden="true">
                    <span
                      v-for="n in DOTS"
                      :key="n"
                      class="dot"
                      :data-filled="n <= dotsFor(r.selbst) ? 'true' : 'false'"
                      :style="{ '--i': n }"
                    />
                  </span>
                  <span class="pct">{{ r.selbst }} %</span>
                </li>
              </ul>
            </template>
            <p class="foot">1 Punkt = 5 % · nur Gruppen ab 10 Stimmen</p>
          </div>
        </div>

        <div class="mine-row">
          <p v-if="given.length" class="given">
            <b>Deine Angaben:</b> {{ given.join(" · ") }}
            <button class="c-link" type="button" @click="change">ändern</button>
          </p>
          <span class="trash">
            <Trash2 aria-hidden="true" height="16" width="16" />
            <button
              ref="trigger"
              class="c-link"
              :aria-expanded="confirming"
              aria-controls="word-poll-confirm"
              type="button"
              @click="askDelete"
            >
              Stimme und Angaben löschen
            </button>
          </span>
        </div>
        <div class="notice u-sr-only-empty" role="alert">
          <div v-if="deleteFailed" class="c-state" data-variant="error">
            <CircleAlert aria-hidden="true" height="18" width="18" />
            <span class="body">Löschen hat nich jeklappt. Versuch’s gleich nochmal.</span>
          </div>
        </div>
        <!-- Inline, so a plain element with role="alertdialog" instead of a native modal dialog: the page stays
             usable around it (SPEC 7.4), Esc and the focus return are handled below. -->
        <div
          v-if="confirming"
          id="word-poll-confirm"
          class="confirm"
          role="alertdialog"
          aria-labelledby="word-poll-confirm-title"
          aria-describedby="word-poll-confirm-text"
          @keydown.esc.stop="cancelDelete"
        >
          <p class="text">
            <b id="word-poll-confirm-title">Wirklich löschen?</b>
            <span id="word-poll-confirm-text">
              Deine Stimme und deine Angaben zu „{{ label }}“ werden entfernt. Dit lässt sich nich
              rückgängig machen.
            </span>
          </p>
          <div class="actions">
            <button
              ref="yes"
              class="c-button"
              data-variant="primary"
              :aria-busy="pending"
              :aria-describedby="online ? undefined : 'word-poll-offline'"
              :aria-disabled="pending || !online"
              type="button"
              @click="remove"
            >
              Ja, löschen
            </button>
            <button class="c-link" type="button" @click="cancelDelete">Abbrechen</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Area, Usage } from "payload-app/word-feedback";

import BerlinAreaMap from "@components/word-feedback/BerlinAreaMap.vue";
import { USAGE_OPTIONS } from "@components/word-feedback/usageOptions";
import { OFFLINE_HINT, useOnline } from "@composables/useOnline.ts";
import { type PollResult, MIN_GROUP, dotsFor } from "@lib/pollResult.ts";
import { useStore } from "@nanostores/vue";
import {
  $feedback,
  $profile,
  $sendError,
  answerUsage,
  deleteFeedback,
  loadFeedback,
  refreshFeedback,
  sendFeedback,
  setRemember,
  type Profile,
} from "@stores/wordFeedback.ts";
import { trackEvent } from "@utils/analytics";
import {
  ALL_STEPS,
  CHOICES,
  NOT_BERLIN,
  QUESTIONS,
  profilePatch,
  progressSegments,
  type ProfileStep,
} from "@utils/wordFeedbackView";
import { AREA_LOCALITIES, LOCALITY_NAMES } from "payload-app/word-feedback";
import CircleAlert from "virtual:icons/lucide/circle-alert";
import Trash2 from "virtual:icons/lucide/trash-2";
import WifiOff from "virtual:icons/lucide/wifi-off";
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from "vue";

import { BERLIN_AREAS } from "@/data/berlinAreas";

// "Sagste det noch?": A vote, B questions, C result (SPEC 7). The own answers load after hydration from the
// no-store GET (never from props: the page HTML is shared and cached); `initial` is the shared result.
const props = defineProps<{ initial: PollResult; label: string; slug: string; wordId: number }>();

const DOTS = 20;

const online = useOnline();
const feedback = useStore($feedback);
const sendError = useStore($sendError);

const root = useTemplateRef<HTMLElement>("root");
const notice = useTemplateRef<HTMLElement>("notice");
const trigger = useTemplateRef<HTMLButtonElement>("trigger");
const yes = useTemplateRef<HTMLButtonElement>("yes");

type View = "questions" | "result" | "vote";
const view = ref<View | null>(null); // null = derived from the loaded own vote
// The store is module state: after a navigation it can still hold the previous word until this word's GET is in.
const loaded = ref(false);
const mineNow = computed(() => (loaded.value ? feedback.value?.mine : null));
const current = computed<View>(() => view.value ?? (mineNow.value?.usage ? "result" : "vote"));

const result = ref<PollResult>(props.initial);
watch(
  () => (loaded.value ? feedback.value?.result : undefined),
  (r) => r && (result.value = r as PollResult),
  { immediate: true },
);
const total = computed(() => result.value.total);

const pending = ref(false);
const refreshing = ref(false);
const pendingUsage = ref<Usage | null>(null);
const failedUsage = ref<Usage | null>(null);
const voteFailed = computed(() => !!failedUsage.value);
const answerFailed = ref(false);
const deleteFailed = ref(false);
const deleted = ref(false);
const thanks = ref(false);
const confirming = ref(false);
const explainOpen = ref(true);
const enter = ref<"back" | "forward">();

const own = computed<Usage | null>(
  () => (mineNow.value?.usage as Usage | null | undefined) ?? null,
);

// ---- answers (what is stored for this device and word)
type Answers = Partial<Record<ProfileStep, string | null>>;
const fromMine = (m: Record<string, unknown> | null | undefined): Answers =>
  Object.fromEntries(
    (["area", "locality", "origin", "half", "age"] as const)
      .filter((k) => m?.[k])
      .map((k) => [k, m![k] as string]),
  );
const answers = ref<Answers>({});
let synced = false;
watch(
  mineNow,
  (m) => {
    if (m && !synced) {
      synced = true;
      answers.value = fromMine(m);
    }
  },
  { immediate: true },
);

const sequence = computed<ProfileStep[]>(() => {
  const a = answers.value;
  const outside = NOT_BERLIN.has(a.area ?? "");
  return [
    "area",
    ...(a.area && a.area in AREA_LOCALITIES ? (["locality"] as const) : []),
    "origin",
    ...(a.origin === "grewUp" && !outside ? (["half"] as const) : []),
    "age",
  ];
});
const step = ref<ProfileStep>("area");
const steps = computed(() => ["usage", ...sequence.value]);
const stepIndex = computed(() => Math.max(1, steps.value.indexOf(step.value)));
const segments = computed(() => progressSegments(ALL_STEPS, steps.value, step.value));
const choices = computed(() =>
  step.value === "locality"
    ? Object.entries(AREA_LOCALITIES[answers.value.area as keyof typeof AREA_LOCALITIES] ?? {}).map(
        ([value, label]) => ({ label: label as string, value }),
      )
    : step.value === "area"
      ? []
      : CHOICES[step.value as keyof typeof CHOICES],
);

// ---- focus (user-driven changes only, never mount)
const focusSoon = async (target: () => HTMLElement | null | undefined) => {
  await nextTick();
  target()?.focus();
};
const focusQuestion = () =>
  focusSoon(() => root.value?.querySelector<HTMLElement>("[data-autofocus]"));

const goTo = (to: ProfileStep, dir: "back" | "forward" = "forward") => {
  enter.value = dir;
  step.value = to;
  explainOpen.value = to === "area";
  thanks.value = false;
  void focusQuestion();
};

// ---- loading
const refresh = async () => {
  refreshing.value = true;
  try {
    const state = await refreshFeedback(props.wordId);
    if (state?.result) result.value = state.result;
  } catch {
    // The shown numbers stay as they are.
  } finally {
    refreshing.value = false;
  }
};

onMounted(async () => {
  await loadFeedback(props.wordId);
  loaded.value = true;
});

// ---- A: vote
const startQuestions = () => {
  view.value = "questions";
  thanks.value = true;
  enter.value = undefined;
  step.value = "area";
  explainOpen.value = true;
  void focusSoon(() => notice.value);
};

const vote = async (usage: Usage) => {
  if (pending.value || !online.value) return;
  pending.value = true;
  pendingUsage.value = usage;
  try {
    // A failed GET left no state: retry it first, or the answer would not be stored.
    if (!feedback.value) await loadFeedback(props.wordId);
    if (!feedback.value) {
      $sendError.set(null);
      failedUsage.value = usage;
      return;
    }
    trackEvent("Word Feedback", "usage", usage);
    // silent: the strip is the one channel for a failed vote.
    if (!(await answerUsage(props.wordId, usage, true))) {
      failedUsage.value = usage;
      return;
    }
    failedUsage.value = null;
    deleted.value = false;
    answers.value = fromMine($feedback.get()?.mine);
    synced = true;
    if (Object.keys(answers.value).length) {
      view.value = "result";
      void focusQuestion();
    } else startQuestions();
    void refresh();
  } finally {
    pending.value = false;
    pendingUsage.value = null;
  }
};

const retry = () => {
  if (pending.value || !online.value || !failedUsage.value) return;
  return vote(failedUsage.value);
};

// ---- B: questions
const answer = async (key: ProfileStep, value: string | null) => {
  if (pending.value || !online.value) return;
  answerFailed.value = false;
  if (answers.value[key] === value) return advance(key);
  pending.value = true;
  try {
    const dropsHalf = key === "area" && NOT_BERLIN.has(value ?? "");
    const hadLocality = answers.value.locality || $profile.get().locality;
    const patch = profilePatch(key, value, {
      area: answers.value.area,
      hadLocality,
    }) as Parameters<typeof sendFeedback>[1];
    if (!(await sendFeedback(props.wordId, patch, { silent: true }))) {
      answerFailed.value = true;
      return;
    }
    const next: Answers = { ...answers.value };
    for (const [k, v] of Object.entries(patch)) {
      if (v) next[k as ProfileStep] = v as string;
      else delete next[k as ProfileStep];
    }
    answers.value = next;
    // Keeps a remembered profile (old opt-in) in step; without the opt-in it lives in memory only.
    $profile.set({ ...$profile.get(), ...patch } as Profile);
    // Released before moving on: showResult() ignores a call while a request is pending (last question).
    pending.value = false;
    advance(key);
  } finally {
    pending.value = false;
  }
};

const advance = (from: ProfileStep) => {
  const next = sequence.value[sequence.value.indexOf(from) + 1];
  if (next) goTo(next);
  else showResult();
};
const skip = () => {
  if (!pending.value) advance(step.value);
};
const back = () => {
  const prev = sequence.value[sequence.value.indexOf(step.value) - 1];
  if (!pending.value && prev) goTo(prev, "back");
};
const showResult = () => {
  if (pending.value) return;
  view.value = "result";
  thanks.value = false;
  void refresh();
  void focusQuestion();
};
const change = () => {
  view.value = "questions";
  step.value = "area";
  explainOpen.value = true;
  thanks.value = false;
  enter.value = "forward";
  void focusQuestion();
};

// ---- C: result
const ownIndex = computed(() => (own.value ? result.value.matrix.indexOf(own.value) : -1));
const share = (u: Usage) =>
  result.value.shares[{ know: "kenn", never: "nie", say: "selbst" }[u] as "kenn"];
const labelOf = (key: string, list: { label: string; value: string }[]) =>
  list.find((o) => o.value === key)?.label ?? key;
const regionLabel = { ost: "Ost", umland: "Umland", west: "West" } as Record<string, string>;
// The server leaves small groups out already; hold the same line here.
const regions = computed(() => result.value.byRegion.filter((g) => g.n >= MIN_GROUP));
const ages = computed(() => result.value.byAge.filter((g) => g.n >= MIN_GROUP));
const groups = computed(() => [
  {
    id: "region",
    label: "„Sag ick selbst“ nach Wohnort",
    rows: regions.value.map((g) => ({
      key: g.key,
      label: regionLabel[g.key] ?? g.key,
      selbst: g.selbst,
    })),
  },
  {
    id: "age",
    label: "„Sag ick selbst“ nach Alter",
    rows: ages.value.map((g) => ({
      key: g.key,
      label: labelOf(g.key, CHOICES.age),
      selbst: g.selbst,
    })),
  },
]);
const given = computed(() => {
  const a = answers.value;
  const area = a.area
    ? a.area === "brandenburg"
      ? "Brandenburg"
      : a.area === "elsewhere"
        ? "Woanders"
        : BERLIN_AREAS.find((x) => x.key === a.area)?.name
    : null;
  const kiez = a.locality ? LOCALITY_NAMES[a.locality as keyof typeof LOCALITY_NAMES] : null;
  return [
    area ? (kiez ? `${area} (${kiez})` : area) : null,
    a.origin ? labelOf(a.origin, CHOICES.origin) : null,
    a.age ? labelOf(a.age, CHOICES.age) : null,
  ].filter((x): x is string => !!x);
});

// ---- delete
const askDelete = () => {
  deleteFailed.value = false;
  confirming.value = true;
  void focusSoon(() => yes.value);
};
const cancelDelete = () => {
  if (pending.value) return;
  confirming.value = false;
  deleteFailed.value = false;
  void focusSoon(() => trigger.value);
};
const remove = async () => {
  if (pending.value || !online.value) return;
  pending.value = true;
  deleteFailed.value = false;
  try {
    if (!(await deleteFeedback(props.wordId))) {
      deleteFailed.value = true;
      return;
    }
  } finally {
    pending.value = false;
  }
  confirming.value = false;
  answers.value = {};
  // The remembered profile (old opt-in) belongs to the deleted answers too: a later vote must not send it back.
  setRemember(false);
  $profile.set({});
  failedUsage.value = null;
  deleted.value = true;
  view.value = "vote";
  void focusSoon(() => notice.value);
  void refresh();
};

const plural = (n: number) => `${n.toLocaleString("de-DE")} ${n === 1 ? "Stimme" : "Stimmen"}`;
</script>

<style lang="scss">
@use "@styles/components/word-poll";
</style>
