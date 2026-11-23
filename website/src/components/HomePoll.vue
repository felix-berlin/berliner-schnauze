<template>
  <div class="c-home-poll">
    <div class="inner">
      <div class="intro">
        <header class="head">
          <p class="eyebrow" aria-hidden="true"><s>Forschen Sie mit</s></p>
          <h2>Forsch ma mit!</h2>
          <p class="sub">
            Wir wollen wissen, wo und von wem Berlinerisch heute noch gesprochen wird. Ein Klick,
            keene Anmeldung.
          </p>
        </header>
        <a class="word" :href="routeToWord(slug)">
          <small>Dit Wort steht zur Abstimmung</small>
          <b>{{ lemma }}</b>
          <span>{{ meaning }}</span>
          <IconArrowRight class="arrow" aria-hidden="true" />
        </a>
      </div>

      <div class="vote">
        <template v-if="!result">
          <p class="question">Sagste <b>„{{ lemma }}“</b> noch?</p>
          <div v-if="failed" class="c-state" data-variant="error" role="alert">
            <CircleAlert aria-hidden="true" height="18" width="18" />
            <span class="body">
              <b>Ditt hat nich jeklappt.</b>
              <span>
                {{ sendError || "Deine Stimme is nich anjekommen." }}
                <button
                  :aria-disabled="pending"
                  class="c-textlink"
                  data-variant="inline"
                  type="button"
                  @click="vote(failed)"
                >
                  Nochmal versuchen
                </button>
              </span>
            </span>
          </div>
          <div class="tiles" role="group" aria-label="Sagste det noch?">
            <button
              v-for="o in USAGE_OPTIONS"
              :key="o.value"
              :aria-disabled="pending"
              class="tile"
              type="button"
              @click="vote(o.value)"
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
          <p class="hint">
            {{
              votes
                ? `Schon ${plural(votes)} – wat sagst du? Dit Ergebnis siehste danach.`
                : "Noch keener hat abjestimmt – mach den Anfang!"
            }}
          </p>
        </template>

        <div aria-live="polite">
          <template v-if="result">
            <h3 ref="resultHeading" class="done" tabindex="-1">
              <IconCheck aria-hidden="true" /> Stimme jezählt. <span>Danke, dit hilft!</span>
            </h3>
            <UsageDots :dots="result.dots" :label="result.label" />
            <!-- role="list": Safari drops list semantics of an unstyled list. -->
            <ul class="legend" role="list">
              <li
                v-for="l in result.legend"
                :key="l.value"
                :data-state="l.mine ? 'mine' : undefined"
              >
                <i :data-usage="l.value" aria-hidden="true" />
                <span>{{ l.label }}<small v-if="l.mine">deine Stimme</small></span>
                <b>{{ l.percent }} %</b>
              </li>
            </ul>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Usage } from "payload-app/word-feedback";

import UsageDots from "@components/UsageDots.vue";
import { USAGE_OPTIONS } from "@components/word-feedback/usageOptions";
import { dotsFromShares } from "@lib/largestRemainder.ts";
import { useStore } from "@nanostores/vue";
import { $feedback, $sendError, answerUsage, loadFeedback } from "@stores/wordFeedback.ts";
import { trackEvent } from "@utils/analytics";
import { routeToWord } from "@utils/helpers.ts";
import { largestRemainder, plural } from "@utils/wordFeedbackView";
import { computed, defineAsyncComponent, nextTick, onMounted, ref, useTemplateRef } from "vue";

const IconArrowRight = defineAsyncComponent(() => import("virtual:icons/lucide/arrow-right"));
const IconCheck = defineAsyncComponent(() => import("virtual:icons/lucide/check"));
const CircleAlert = defineAsyncComponent(() => import("virtual:icons/lucide/circle-alert"));

// The start page poll: the word page's usage vote (same store, same endpoint), shown as 100 dots.
const props = defineProps<{
  lemma: string;
  meaning: string;
  slug: string;
  total: number;
  wordId: number;
}>();

const feedback = useStore($feedback);
const sendError = useStore($sendError);
const pending = ref(false);
// The answer whose send failed: the retry sends it again.
const failed = ref<Usage | null>(null);
const heading = useTemplateRef<HTMLElement>("resultHeading");

const SHARE_TEXT = { know: "kennen es", never: "haben es nie gehört", say: "sagen es selbst" };

const votes = computed(() => {
  const t = feedback.value?.totals;
  return t ? t.say + t.know + t.never : props.total;
});

// The result shows once this device has a usage answer for the word (one vote per device and word).
const result = computed(() => {
  const f = feedback.value;
  const mine = f?.mine?.usage;
  if (!f || !mine) return null;
  const shares = largestRemainder(USAGE_OPTIONS.map((o) => f.totals[o.value]));
  // shortcut: the own dot is the first of its group; a group rounded to 0 dots has no mark.
  const dots = dotsFromShares(
    USAGE_OPTIONS.map((o) => o.value),
    shares,
  ).map((usage, i, all) => ({ mine: usage === mine && all.indexOf(usage) === i, usage }));
  return {
    dots,
    label: USAGE_OPTIONS.map((o, i) => `${shares[i]} Prozent ${SHARE_TEXT[o.value]}`).join(", "),
    legend: USAGE_OPTIONS.map((o, i) => ({
      label: o.label,
      mine: o.value === mine,
      percent: shares[i],
      value: o.value,
    })),
  };
});

onMounted(() => loadFeedback(props.wordId));

const vote = async (usage: Usage) => {
  if (pending.value) return;
  pending.value = true;
  try {
    // A failed GET left no state: retry it first, or the store would not apply the answer.
    if (!feedback.value) await loadFeedback(props.wordId);
    trackEvent("Word Feedback", "usage", usage);
    // silent: the inline alert is the one channel for a failed vote, no toast.
    const ok = feedback.value ? await answerUsage(props.wordId, usage, true) : false;
    failed.value = ok ? null : usage;
    if (ok) {
      await nextTick();
      heading.value?.focus();
    }
  } finally {
    pending.value = false;
  }
};
</script>

<style lang="scss">
@use "@styles/components/home-poll";
</style>
