<template>
  <section class="c-search-app">
    <header class="head">
      <h1>Wörter suchen</h1>
      <p>
        {{ formatCount(meta.totalWords) }} Wörter und Redewendungen. Such uff Berlinerisch oder
        Hochdeutsch.
      </p>
    </header>

    <form role="search" method="get" action="/wort" class="field">
      <label for="search-q" class="u-sr-only">Wort oder Bedeutung suchen</label>
      <input
        id="search-q"
        type="search"
        name="q"
        :value="state.q"
        placeholder="Wort oder Bedeutung"
        autocomplete="off"
        enterkeyhint="search"
      />
      <input v-for="[key, value] in kept" :key="key" type="hidden" :name="key" :value="value" />
      <button type="submit">Suchen</button>
    </form>

    <p class="meta" aria-live="polite">{{ metaText }}</p>

    <nav v-if="!state.q" class="register" aria-label="Springen zu Buchstabe">
      <p class="label">Springen zu</p>
      <p class="hint">
        Alle Wörter von A bis Z. Die Zahl zeigt, wie viele mit dem Buchstaben anfangen.
      </p>
      <ul>
        <li v-for="l in meta.letters" :key="l.letter">
          <a
            :href="`/wort?buchstabe=${encodeURIComponent(l.letter.toLocaleLowerCase('de'))}`"
            :aria-label="`${l.letter}, ${l.count} Wörter`"
            :aria-current="state.letter === l.letter ? 'true' : undefined"
          >
            <b>{{ l.letter }}</b> <small>{{ l.count }}</small>
          </a>
        </li>
      </ul>
    </nav>

    <ul v-if="result.rows.length" id="treffer" class="list">
      <template v-for="(row, i) in result.rows" :key="i">
        <li v-if="row.kind === 'letter'" role="presentation" class="letter">
          <h2>{{ row.letter }}</h2>
          <span>{{ row.count }} Wörter</span>
        </li>
        <li v-else-if="row.kind === 'divider'" role="presentation" class="divider">
          {{ row.label }}
        </li>
        <HitRow v-else :hit="row.hit" />
      </template>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { SearchResult } from "@lib/search/run";
import type { SearchState } from "@lib/search/state";
import type { ListRow } from "@lib/search/types";

import { toParams } from "@lib/search/url";
import { computed } from "vue";

import HitRow from "./HitRow.vue";

const props = defineProps<{
  state: SearchState;
  result: Omit<SearchResult, "rows"> & { rows: ListRow[] };
  meta: {
    themes: { name: string; slug: string }[];
    pos: string[];
    areas: { key: string; name: string }[];
    letters: { letter: string; count: number }[];
    totalWords: number;
  };
  wotd?: string;
}>();

const formatCount = (n: number) => n.toLocaleString("de-DE");

// The no-JS form keeps the active filters; only the typed query is replaced.
const kept = computed(() => [...toParams({ ...props.state, q: "" })]);

const metaText = computed(() => {
  const { q } = props.state;
  const n = props.result.total;
  if (n === 0) return q ? `Keene Treffer für „${q}“` : "Keene Treffer mit diesen Filtern";
  if (q) return `${formatCount(n)} Treffer für „${q}“`;
  return `${formatCount(n)} Wörter`;
});
</script>

<style lang="scss">
@use "@styles/components/search-app";
</style>
