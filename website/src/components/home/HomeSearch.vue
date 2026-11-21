<template>
  <form class="c-home-search" role="search" method="get" action="/suche" @submit="onSubmit">
    <label :for="inputId" class="u-sr-only">Wort suchen</label>
    <IconSearch class="lens" aria-hidden="true" />
    <input
      :id="inputId"
      ref="field"
      v-model="query"
      type="search"
      name="q"
      role="combobox"
      aria-autocomplete="list"
      :aria-controls="listId"
      :aria-expanded="showList"
      :aria-activedescendant="activeId"
      :placeholder="placeholder"
      autocomplete="off"
      autocapitalize="none"
      spellcheck="false"
      enterkeyhint="search"
      @focus="onFocus"
      @blur="open = false"
      @keydown="onKeydown"
    />
    <button v-if="query" type="button" class="clear" aria-label="Eingabe löschen" @click="clear">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 4l8 8M12 4l-8 8" />
      </svg>
    </button>
    <!-- aria-label keeps the name when the text is hidden below 808px. -->
    <button type="submit" class="submit" aria-label="Suchen">
      <IconSearch aria-hidden="true" />
      <span>Suchen</span>
    </button>

    <!-- mousedown.prevent: clicks in the popup keep the focus (and the list) in the field. -->
    <div v-if="showList && result" class="popup" @mousedown.prevent>
      <div :id="listId" role="listbox" aria-label="Vorschläge">
        <template v-for="group in groups" :key="group.key">
          <div v-if="group.hits.length" role="group" :aria-labelledby="`${listId}-${group.key}`">
            <div :id="`${listId}-${group.key}`" class="label" role="presentation">
              {{ group.label }}
            </div>
            <a
              v-for="hit in group.hits"
              :id="optionId(hit.index)"
              :key="hit.slug"
              role="option"
              tabindex="-1"
              :aria-selected="hit.index === active"
              :href="routeToWord(hit.slug)"
            >
              <b
                ><template v-for="(part, i) in lemmaParts(group.key, hit.lemma)" :key="i"
                  ><mark v-if="part.mark">{{ part.text }}</mark
                  ><template v-else>{{ part.text }}</template></template
                ></b
              >
              <span
                ><template v-for="(part, i) in meaningParts(group.key, hit.meaning)" :key="i"
                  ><mark v-if="part.mark">{{ part.text }}</mark
                  ><template v-else>{{ part.text }}</template></template
                ></span
              >
              <kbd v-if="hit.index === active" aria-hidden="true">Enter</kbd>
            </a>
          </div>
        </template>
      </div>
      <a class="all" :href="searchUrl(result.q)"
        >Alle {{ result.count }} Treffer für „{{ result.q }}“ <IconArrowRight aria-hidden="true"
      /></a>
      <p class="keys" aria-hidden="true">
        <kbd>↑</kbd><kbd>↓</kbd> auswählen · <kbd>Enter</kbd> öffnen · <kbd>Esc</kbd> schließen
      </p>
    </div>

    <!-- Always rendered, so screen readers pick up the no-hit and error messages when they appear. -->
    <div role="status">
      <div v-if="showFailed" class="popup" @mousedown.prevent>
        <p class="none">
          <b>Die Suche is jerade nich erreichbar.</b>
          <span>Versuch's jleich nochmal.</span>
        </p>
      </div>
      <div v-if="showNoHit && result" class="popup" @mousedown.prevent>
        <p class="none">
          <b>Nüscht jefunden für „{{ result.q }}“</b>
          <span v-if="result.similar.length"
            >Meintest du
            <template v-for="(word, i) in result.similar" :key="word.slug"
              ><template v-if="i > 0"> oder </template
              ><a :href="routeToWord(word.slug)">{{ word.lemma }}</a></template
            >?</span
          >
        </p>
        <a class="add" :href="suggestUrl(result.q)">
          <IconPlus aria-hidden="true" />
          <span
            ><b>„{{ result.q }}“ als Wort vorschlagen</b
            ><small>Kennste dit? Dann trag et ein.</small></span
          >
        </a>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import type { HomeHit } from "@utils/homeSearch.ts";

import { search } from "@orama/orama";
import { FULL_TEXT, getWordDb } from "@services/wordSearchDb.ts";
import { isEditableTarget, routeToWord } from "@utils/helpers.ts";
import {
  groupHits,
  highlight,
  MAX_HITS,
  MIN_QUERY,
  navigate,
  searchUrl,
  suggestUrl,
} from "@utils/homeSearch.ts";
import { reportError } from "@utils/reportError.ts";
import { useEventListener, watchDebounced } from "@vueuse/core";
import { computed, defineAsyncComponent, ref, shallowRef, useId, useTemplateRef } from "vue";

import type { OramaSearchIndex } from "@/pages/api/search/index.json";

// TODO(startseite): the header search modal stays as is; whether this list replaces it on the start page is open (docs/design/startseite-v20/SPEC.md §8).

const IconSearch = defineAsyncComponent(() => import("virtual:icons/lucide/search"));
const IconArrowRight = defineAsyncComponent(() => import("virtual:icons/lucide/arrow-right"));
const IconPlus = defineAsyncComponent(() => import("virtual:icons/lucide/plus"));

const { placeholder = "Wat suchste? Berlinerisch oder Hochdeutsch" } = defineProps<{
  placeholder?: string;
}>();

type Result = {
  count: number;
  lemma: HomeHit[];
  meaning: HomeHit[];
  q: string;
  similar: Pick<HomeHit, "lemma" | "slug">[];
};

const SIMILAR_TOLERANCE = 3; // wider than the list's 1, for "Meintest du X oder Y?"

const field = useTemplateRef("field");
const inputId = useId();
const listId = `${inputId}-list`;
const optionId = (index: number) => `${listId}-${index}`;

const query = ref("");
const open = ref(false);
const active = ref(-1);
const result = shallowRef<null | Result>(null);
const failed = ref(false);

const options = computed(() =>
  result.value ? [...result.value.lemma, ...result.value.meaning] : [],
);
const visible = computed(
  () => open.value && !!result.value && query.value.trim().length >= MIN_QUERY,
);
const showList = computed(() => visible.value && options.value.length > 0);
const showFailed = computed(() => failed.value && query.value.trim().length >= MIN_QUERY);
const showNoHit = computed(() => visible.value && result.value?.count === 0);
const activeId = computed(() =>
  showList.value && active.value >= 0 ? optionId(active.value) : undefined,
);

const groups = computed(() => {
  const { lemma = [], meaning = [] } = result.value ?? {};
  const indexed = (hits: HomeHit[], offset: number) =>
    hits.map((hit, i) => ({ ...hit, index: offset + i }));
  return [
    { hits: indexed(lemma, 0), key: "lemma", label: "Berlinerisch" },
    { hits: indexed(meaning, lemma.length), key: "meaning", label: "Gefunden über Hochdeutsch" },
  ] as const;
});

// Lemma hits mark the lemma, meaning hits mark the meaning (SPEC §8).
const lemmaParts = (key: string, text: string) =>
  key === "lemma" ? highlight(text, result.value?.q ?? "") : [{ mark: false, text }];
const meaningParts = (key: string, text: string) =>
  key === "meaning" ? highlight(text, result.value?.q ?? "") : [{ mark: false, text }];

async function runSearch(raw: string) {
  const q = raw.trim();
  failed.value = false;
  if (q.length < MIN_QUERY) {
    result.value = null;
    return;
  }
  try {
    const { db } = await getWordDb();
    const found = await search(db, { ...FULL_TEXT, limit: MAX_HITS, term: q });
    // The index entries are stored whole; Orama's type only knows the schema (no slug).
    const docs = found.hits.map(({ document }) => document as unknown as OramaSearchIndex);
    const similar =
      found.count === 0
        ? (
            await search(db, {
              limit: 2,
              properties: ["wordProperties.berlinerisch"],
              term: q,
              tolerance: SIMILAR_TOLERANCE,
            })
          ).hits.map(({ document }) => {
            const { slug, wordProperties } = document as unknown as OramaSearchIndex;
            return { lemma: wordProperties.berlinerisch, slug };
          })
        : [];
    if (q !== query.value.trim()) return; // a newer input has taken over
    result.value = { count: found.count, q, similar, ...groupHits(docs, q) };
    active.value = -1;
    open.value = document.activeElement === field.value;
  } catch (err) {
    failed.value = true;
    result.value = null;
    reportError(err);
  }
}

watchDebounced(query, (q) => void runSearch(q), { debounce: 150 });

function onFocus() {
  // Lazy: the index loads on first focus, never on mount. Errors surface on the next search.
  getWordDb().catch((err: unknown) => console.error("[HomeSearch] index preload failed:", err));
  if (result.value) open.value = true;
}

function submit() {
  const q = query.value.trim();
  if (q) navigate(searchUrl(q));
}

function onSubmit(event: Event) {
  event.preventDefault();
  submit();
}

function clear() {
  query.value = "";
  result.value = null;
  active.value = -1;
  field.value?.focus();
}

function onKeydown(event: KeyboardEvent) {
  const count = options.value.length;
  switch (event.key) {
    case "ArrowDown":
    case "ArrowUp": {
      if (!count || !result.value) return;
      event.preventDefault();
      open.value = true;
      const step = event.key === "ArrowDown" ? 1 : -1;
      active.value =
        active.value < 0 ? (step > 0 ? 0 : count - 1) : (active.value + step + count) % count;
      break;
    }
    case "Enter": {
      // IME confirmation (keyCode 229 covers Safari's out-of-order compositionend).
      if (event.isComposing || event.keyCode === 229) return;
      event.preventDefault();
      const hit = showList.value ? options.value[active.value] : undefined;
      if (hit) navigate(routeToWord(hit.slug));
      else submit();
      break;
    }
    case "Escape": {
      // ARIA APG combobox: the first Esc closes the list, the next clears the field.
      if (visible.value) {
        event.preventDefault();
        open.value = false;
        active.value = -1;
      } else if (query.value) {
        event.preventDefault();
        clear();
      }
      break;
    }
  }
}

// "/" focuses the field unless a field already has focus. Window capture runs before the header's
// window bubble listener; stopping it there keeps the search modal closed. The default target
// (window) is SSR-safe: VueUse skips it on the server.
useEventListener(
  "keydown",
  (event: KeyboardEvent) => {
    if (event.key !== "/" || event.repeat || isEditableTarget(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    field.value?.focus();
  },
  { capture: true },
);
</script>

<style lang="scss">
@use "@styles/components/home-search";
</style>
