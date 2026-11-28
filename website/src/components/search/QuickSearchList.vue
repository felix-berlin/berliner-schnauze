<template>
  <div class="c-quick-search-list" :data-variant="mobile ? 'mobile' : undefined">
    <!-- „Verlauf löschen“ is a button: it stays outside the listbox (only groups and options belong there). The
         history is always the first group, so this head sits right above it. -->
    <div v-if="model.groups[0]?.label === 'Zuletzt jesucht'" class="head">
      <span aria-hidden="true">Zuletzt jesucht</span>
      <button type="button" class="clear" @click="emit('clearHistory')">Verlauf löschen</button>
    </div>
    <div :id="id" role="listbox" aria-label="Vorschläge">
      <template v-for="group in model.groups" :key="group.label ?? 'aktionen'">
        <div v-if="!group.label" class="sep" role="presentation" />
        <!-- The unlabeled action group is no group for screen readers: its options sit in the listbox. -->
        <div
          v-bind="
            group.label ? { role: 'group', 'aria-label': group.label } : { role: 'presentation' }
          "
        >
          <div
            v-if="group.label && group.label !== 'Zuletzt jesucht'"
            class="head"
            aria-hidden="true"
          >
            {{ group.label }}
          </div>
          <div
            v-for="option in group.options"
            :id="option.id"
            :key="option.id"
            role="option"
            :aria-selected="option.id === activeId ? 'true' : 'false'"
            class="row"
            @click="emit('pick', option)"
          >
            <template v-if="option.kind === 'word'">
              <!-- Play: pointer only, no control inside the option (SPEC §24: the word page has the player for the
                 keyboard). It plays and never opens the word. -->
              <span
                v-if="option.hit.entry.audio"
                class="tile"
                data-variant="play"
                aria-hidden="true"
                :title="`${option.hit.entry.wordProperties.berlinerisch} anhören`"
                @click.stop="toggleVoice(voiceKey(option.id), option.hit.entry.audio)"
              >
                <IconSquare v-if="isVoicePlaying(voiceKey(option.id))" />
                <IconPlay v-else />
              </span>
              <span v-else class="tile" data-variant="empty" aria-hidden="true" />
              <span class="text">
                <span class="word"
                  ><template
                    v-for="(p, i) in highlightParts(
                      option.hit.entry.wordProperties.berlinerisch,
                      model.q,
                    )"
                    :key="i"
                    ><mark v-if="p.mark">{{ p.text }}</mark
                    ><template v-else>{{ p.text }}</template></template
                  ><small v-if="option.hit.entry.article">, {{ option.hit.entry.article }}</small
                  ><span
                    v-if="option.hit.entry.slug === ctx.wotd"
                    class="badge"
                    data-variant="wotd"
                    role="img"
                    title="Wort des Tages"
                    aria-label="Wort des Tages"
                    ><IconCalendar aria-hidden="true" /></span
                  ><span
                    v-if="
                      (ctx.trendRanks.get(option.hit.entry.slug) ?? Infinity) <= TREND_BADGE_MAX
                    "
                    class="badge"
                    role="img"
                    title="Gerade beliebt"
                    aria-label="Gerade beliebt"
                    ><IconTrend aria-hidden="true" /></span
                ></span>
                <span class="meanings"
                  ><template
                    v-for="(p, i) in highlightParts(
                      option.hit.entry.wordProperties.translations.join(', '),
                      model.q,
                    )"
                    :key="i"
                    ><mark v-if="p.mark">{{ p.text }}</mark
                    ><template v-else>{{ p.text }}</template></template
                  ></span
                >
              </span>
            </template>
            <template v-else>
              <span
                class="tile"
                :data-variant="
                  option.kind === 'action' && option.action === 'ki' ? 'ki' : undefined
                "
              >
                <IconClock v-if="option.kind === 'history'" aria-hidden="true" />
                <IconFilter v-else-if="option.action === 'all'" aria-hidden="true" />
                <IconSparkles v-else-if="option.action === 'ki'" aria-hidden="true" />
                <IconPlus v-else aria-hidden="true" />
              </span>
              <span class="label">
                <b>{{ option.kind === "history" ? option.term : option.title }}</b>
                <small v-if="option.kind === 'action'">{{ option.sub }}</small>
              </span>
              <!-- Pointer only, no control inside the option (SPEC §22, §24): Entf removes the active entry. -->
              <span
                v-if="option.kind === 'history'"
                class="remove"
                aria-hidden="true"
                :title="`„${option.term}“ aus dem Verlauf entfernen`"
                @click.stop="emit('remove', option.term)"
              >
                <IconX />
              </span>
            </template>
            <span class="ret" aria-hidden="true"><IconEnter /></span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { QuickModel, QuickOption } from "@lib/search/quick";
import type { SearchContext } from "@lib/search/run";

import { isVoicePlaying, newVoiceKey, toggleVoice } from "@composables/useVoicePlayer.ts";
import { highlightParts } from "@lib/search/highlight";
import { defineAsyncComponent } from "vue";

/** Groups and rows of the quick search (SPEC §22). No tab stop inside an option (SPEC §24). */
defineProps<{
  id: string;
  model: QuickModel;
  activeId?: string;
  ctx: SearchContext;
  mobile: boolean;
}>();
const emit = defineEmits<{
  pick: [option: QuickOption];
  remove: [term: string];
  clearHistory: [];
}>();

/** SPEC §6.1: the top 10 of the trend list get the badge (same as HitRow). */
const TREND_BADGE_MAX = 10;

const IconCalendar = defineAsyncComponent(() => import("virtual:icons/lucide/calendar"));
const IconClock = defineAsyncComponent(() => import("virtual:icons/lucide/clock"));
const IconEnter = defineAsyncComponent(() => import("virtual:icons/lucide/corner-down-left"));
const IconFilter = defineAsyncComponent(() => import("virtual:icons/lucide/list-filter"));
const IconPlay = defineAsyncComponent(() => import("virtual:icons/lucide/play"));
const IconPlus = defineAsyncComponent(() => import("virtual:icons/lucide/plus"));
const IconSparkles = defineAsyncComponent(() => import("virtual:icons/lucide/sparkles"));
const IconSquare = defineAsyncComponent(() => import("virtual:icons/lucide/square"));
const IconTrend = defineAsyncComponent(() => import("virtual:icons/lucide/trending-up"));
const IconX = defineAsyncComponent(() => import("virtual:icons/lucide/x"));

// Playing is tracked per button (useVoicePlayer): one key per row id.
const keys = new Map<string, string>();
const voiceKey = (id: string) => keys.get(id) ?? keys.set(id, newVoiceKey()).get(id)!;
</script>

<style lang="scss">
@use "@styles/components/quick-search-list";
</style>
