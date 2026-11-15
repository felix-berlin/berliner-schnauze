import { USAGE_OPTIONS } from "@components/word-feedback/usageOptions";
import { useStore } from "@nanostores/vue";
import {
  $feedback,
  $profile,
  $remember,
  $sendError,
  deleteAllFeedback,
  loadFeedback,
  nextStep,
  answerUsage,
  sendFeedback,
  type Profile,
} from "@stores/wordFeedback.ts";
import { trackEvent } from "@utils/analytics";
import {
  ALL_STEPS,
  CHOICES,
  ORDER,
  compareRows,
  progressSegments,
  usageBars,
  type ProfileStep,
  type Step,
} from "@utils/wordFeedbackView";
import { useOnline } from "@vueuse/core";
import {
  AREA_LOCALITIES,
  LOCALITY_NAMES,
  type BerlinArea,
  type Locality,
  type Usage,
} from "payload-app/word-feedback";
import { computed, onMounted, ref, watch } from "vue";

import { BERLIN_AREAS } from "@/data/berlinAreas";

/** State, steps and persistence of the word feedback card (WordFeedbackCard.vue): what is asked next, what is sent. */
export const useWordFeedbackFlow = (wordId: number) => {
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

  // Enter animation (CSS only, no View Transitions). Only a user-driven step change sets it, so mount and a
  // revisit's first paint stay still. The card moves the focus on the same change (`data-autofocus`).
  const enter = ref<"back" | "forward">();
  watch(step, (to, from) => {
    enter.value = to && from && ORDER.indexOf(to) < ORDER.indexOf(from) ? "back" : "forward";
    if (to === "usage") announcement.value = "";
  });

  onMounted(async () => {
    await loadFeedback(wordId);
    loadFailed.value = !feedback.value;
  });
  // A later successful answer fills the state: the notice is stale then.
  watch(feedback, (f) => f && (loadFailed.value = false));

  // A failed GET left no state: retry it first, or sendFeedback would not store the answer.
  const ready = async () => {
    if (!feedback.value) await loadFeedback(wordId);
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
      const ok = await answerUsage(wordId, usage, true);
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
      if (await sendFeedback(wordId, patch)) {
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
      if (!(await sendFeedback(wordId, cleared))) return;
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
      if (!(await sendFeedback(wordId, { usage: null }))) return;
    } finally {
      pending.value = false;
    }
    pickedUsage.value = null;
    history.value = [];
    step.value = null;
  };

  const deleteAll = async () => {
    if (pending.value) return;
    pending.value = true;
    try {
      if (!(await deleteAllFeedback(wordId))) return;
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

  const segments = computed(() => progressSegments(ALL_STEPS, steps.value, current.value));

  const totalVotes = computed(() => {
    const t = feedback.value?.totals;
    return t ? t.say + t.know + t.never : 0;
  });

  const bars = computed(() => usageBars(USAGE_OPTIONS, feedback.value?.totals, totalVotes.value));

  const areaName = computed(() => {
    const key = feedback.value?.mine?.area ?? profile.value.area;
    if (!key || key === "elsewhere") return null;
    return key === "brandenburg" ? "Brandenburg" : BERLIN_AREAS.find((a) => a.key === key)?.name;
  });
  const localityName = computed(() => {
    const key: Locality | null | undefined =
      feedback.value?.mine?.locality ?? profile.value.locality;
    return key ? LOCALITY_NAMES[key] : null;
  });

  const rows = computed(() =>
    compareRows(feedback.value?.compare, areaName.value, localityName.value),
  );

  return {
    announcement,
    answerProfile,
    answerUsageStep,
    back,
    bars,
    choices,
    current,
    deleteAll,
    enter,
    failed,
    feedback,
    localityArea,
    online,
    pending,
    picked,
    pickedUsage,
    profile,
    remember,
    reset,
    retry,
    rows,
    segments,
    selected,
    sendError,
    step,
    stepIndex,
    steps,
    totalVotes,
    withdraw,
  };
};
