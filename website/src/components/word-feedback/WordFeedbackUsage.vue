<template>
  <p class="lead" data-autofocus tabindex="-1">Is dit Wort bei dir noch im Einsatz?</p>
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
          (failed.usage ? "Deine Stimme is nich anjekommen." : "Die Stimmen sind nich anjekommen.")
        }}
        <button
          :aria-describedby="!online ? 'word-feedback-offline' : undefined"
          :aria-disabled="pending || !online"
          class="c-textlink"
          data-variant="inline"
          type="button"
          @click="emit('retry')"
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
      @click="emit('answer', o.value)"
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
        ? `Schon ${plural(totalVotes)} – wat sagst du?`
        : "Noch keener hat abjestimmt – mach den Anfang!"
    }}
  </p>
</template>

<script setup lang="ts">
import type { Usage } from "payload-app/word-feedback";

import { USAGE_OPTIONS } from "@components/word-feedback/usageOptions";
import { plural } from "@utils/wordFeedbackView";
import CircleAlert from "virtual:icons/lucide/circle-alert";
import WifiOff from "virtual:icons/lucide/wifi-off";

// The first step: the vote. Presentational; the flow lives in `useWordFeedbackFlow`.
defineProps<{
  failed: { usage: Usage | null } | null;
  online: boolean;
  pending: boolean;
  pickedUsage: Usage | null;
  sendError: string | null | undefined;
  totalVotes: number;
}>();
const emit = defineEmits<{ answer: [usage: Usage]; retry: [] }>();
</script>
