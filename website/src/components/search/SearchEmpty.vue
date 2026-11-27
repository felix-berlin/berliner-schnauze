<template>
  <div class="c-search-empty">
    <div class="inner">
      <!-- SPEC §10 names the moods „nuescht“ / „kratzen“; Kalle's handoff (docs/design/kalle/SPEC.md §5) has them as
         `blank` (Schulterzucken, „keine Treffer“) and `scratch`. TODO(suche): confirm `scratch` for the filter case. -->
      <BerlinerBaer :mood="byFilters ? 'scratch' : 'blank'" :size="120" />
      <div class="body">
        <template v-if="byFilters">
          <h2>Mit diesen Filtern: nüscht</h2>
          <p>Keen Wort passt zu allen Filtern uff eenmal. Nimm een paar raus.</p>
          <p class="actions">
            <button type="button" class="action" @click="emit('reset')">
              Alle Filter zurücksetzen
            </button>
          </p>
        </template>
        <template v-else>
          <h2>Nüscht jefunden für „{{ q }}“</h2>
          <p>Weder im Wort noch in den Bedeutungen. Vielleicht ’n Tippfehler?</p>
          <p v-if="suggestions.length" class="maybe">
            <span class="label">Meinste</span>
            <a v-for="s in suggestions.slice(0, 3)" :key="s.slug" :href="`/wort/${s.slug}`">
              {{ s.wordProperties.berlinerisch }}
            </a>
          </p>
          <p class="actions">
            <button v-if="ai" type="button" class="action" @click="emit('ai')">
              <IconSparkles aria-hidden="true" />Nach Bedeutung suchen
            </button>
            <a class="action" :href="`/wort-vorschlagen?wort=${encodeURIComponent(q)}`">
              Wort vorschlagen
            </a>
          </p>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SearchEntry } from "@lib/search/types";

import BerlinerBaer from "@components/kalle/BerlinerBaer.vue";
import { defineAsyncComponent } from "vue";

/** `ai`: the Chrome AI is there, show „Nach Bedeutung suchen“ (SPEC §8.2). */
defineProps<{ q: string; byFilters: boolean; suggestions: SearchEntry[]; ai?: boolean }>();
const emit = defineEmits<{ reset: []; ai: [] }>();

const IconSparkles = defineAsyncComponent(() => import("virtual:icons/lucide/sparkles"));
</script>

<style lang="scss">
@use "@styles/components/search-empty";
</style>
