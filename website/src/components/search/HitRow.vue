<template>
  <div
    :id="id"
    role="option"
    :aria-selected="active ? 'true' : 'false'"
    class="c-hit-row"
    :data-variant="compact ? 'compact' : undefined"
    @click="open"
  >
    <div class="inner">
      <p class="head">
        <span class="lemma">
          <!-- No tab stop inside the option: keyboard opens via the active option + Enter (SPEC §12). -->
          <a class="word" :href="href" tabindex="-1"
            ><template v-for="(p, i) in highlightParts(word, q)" :key="i"
              ><mark v-if="p.mark">{{ p.text }}</mark
              ><template v-else>{{ p.text }}</template></template
            ></a
          >
          <span v-if="entry.article" class="article">, {{ entry.article }}</span>
        </span>
        <span v-if="pos" class="pos">{{ pos }}</span>
        <span v-if="wotd" class="badge" data-variant="wotd">
          <IconCalendar aria-hidden="true" />Wort des Tages
        </span>
        <span v-if="trending" class="badge" data-variant="trend">
          <IconTrend aria-hidden="true" />Gerade beliebt
        </span>
      </p>

      <p v-if="meanings.length" class="meanings" data-meanings>
        <template v-for="(meaning, i) in meanings" :key="i">
          <template v-if="i > 0">
            <span class="dot" aria-hidden="true" />
            <span class="u-sr-only">; </span>
          </template>
          <template v-for="(p, j) in highlightParts(meaning, q)" :key="j"
            ><mark v-if="p.mark">{{ p.text }}</mark
            ><template v-else>{{ p.text }}</template></template
          >
        </template>
      </p>

      <div v-if="!compact" class="side">
        <span v-if="share" class="usage" title="Anteil „Sag ick selbst“ in der Umfrage">
          jesagt
          <span class="bar" aria-hidden="true"><i :style="{ inlineSize: `${percent}%` }" /></span>
          <b>{{ percent }} %</b>
        </span>
        <span v-else class="few">zu wenig Stimmen</span>
        <!-- Pointer shortcut only; the word page keeps the accessible player.
             TODO(suche): APG combobox with grid popup would make play keyboard-reachable. -->
        <button
          v-if="entry.audio"
          type="button"
          class="play"
          tabindex="-1"
          aria-hidden="true"
          :aria-label="`${word} anhören`"
          :aria-pressed="playing ? 'true' : 'false'"
          @click.stop="toggleVoice(voiceKey, entry.audio)"
        >
          <IconSquare v-if="playing" aria-hidden="true" />
          <IconPlay v-else aria-hidden="true" />
        </button>
        <span v-else class="play" data-play="empty" aria-hidden="true" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SearchState } from "@lib/search/state";
import type { RankedHit } from "@lib/search/types";

import { isVoicePlaying, newVoiceKey, toggleVoice } from "@composables/useVoicePlayer.ts";
import { highlightParts } from "@lib/search/highlight";
import { usageFor } from "@lib/search/usage";
import { navigate } from "astro:transitions/client";
import { computed, defineAsyncComponent } from "vue";

/** SPEC §6.1: the top 10 of the trend list get the badge. */
const TREND_BADGE_MAX = 10;

const props = withDefaults(
  defineProps<{
    hit: RankedHit;
    q: string;
    active: boolean;
    wotd: boolean;
    trendRank?: number;
    id: string;
    /** Bezirk / Altersgruppe of the Gebrauch filter: the share shown is the one of that group. */
    scope?: Pick<SearchState, "area" | "age">;
    /** Header quick search: smaller row without the usage share and play button. */
    compact?: boolean;
  }>(),
  { compact: false, scope: () => ({}), trendRank: undefined },
);

const IconCalendar = defineAsyncComponent(() => import("virtual:icons/lucide/calendar"));
const IconTrend = defineAsyncComponent(() => import("virtual:icons/lucide/trending-up"));
const IconPlay = defineAsyncComponent(() => import("virtual:icons/lucide/play"));
const IconSquare = defineAsyncComponent(() => import("virtual:icons/lucide/square"));

const entry = computed(() => props.hit.entry);
const word = computed(() => entry.value.wordProperties.berlinerisch);
const meanings = computed(() => entry.value.wordProperties.translations);
const pos = computed(() => entry.value.berlinerischWordTypes[0]);
const href = computed(() => `/wort/${entry.value.slug}`);
const trending = computed(
  () => props.trendRank !== undefined && props.trendRank <= TREND_BADGE_MAX,
);
const share = computed(() => usageFor(entry.value.usage, props.scope));
const percent = computed(() => Math.round((share.value?.say ?? 0) * 100));

const voiceKey = newVoiceKey();
const playing = computed(() => isVoicePlaying(voiceKey));

// The whole row opens the word (SPEC §6.1); the link and the play button handle their own clicks.
const open = (e: MouseEvent) => {
  if (e.target instanceof Element && e.target.closest("a, button")) return;
  void navigate(href.value);
};
</script>

<style lang="scss">
@use "@styles/components/hit-row";
</style>
