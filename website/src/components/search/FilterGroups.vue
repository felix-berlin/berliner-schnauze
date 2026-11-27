<template>
  <div class="c-filter-groups">
    <div v-if="group === 'buchstabe'" class="letters">
      <button
        v-for="l in letters"
        :key="l.letter"
        type="button"
        :aria-pressed="state.letter === l.letter ? 'true' : 'false'"
        :aria-label="`${l.letter}, ${formatCount(l.count)} ${l.count === 1 ? 'Wort' : 'Wörter'}`"
        :disabled="!l.count && state.letter !== l.letter"
        @click="emit('update', { letter: state.letter === l.letter ? undefined : l.letter })"
      >
        <b>{{ l.letter }}</b><small>{{ formatCount(l.count) }}</small>
      </button>
    </div>

    <div v-else-if="group === 'wortart'">
      <button
        v-for="pos in meta.pos"
        :key="pos"
        type="button"
        role="checkbox"
        class="check"
        :aria-checked="state.pos.includes(pos) ? 'true' : 'false'"
        @click="emit('update', { pos: toggle(state.pos, pos) })"
      >
        <span class="box" aria-hidden="true"><IconCheck /></span>{{ pos }}
      </button>
    </div>

    <div v-else-if="group === 'thema'">
      <button
        v-for="t in meta.themes"
        :key="t.slug"
        type="button"
        role="checkbox"
        class="check"
        :aria-checked="state.themes.includes(t.slug) ? 'true' : 'false'"
        @click="emit('update', { themes: toggle(state.themes, t.slug) })"
      >
        <span class="box" aria-hidden="true"><IconCheck /></span>{{ t.name }}
      </button>
    </div>

    <template v-else-if="group === 'gebrauch'">
      <fieldset>
        <legend class="label">Wie oft jesagt?</legend>
        <div class="pills">
          <button
            v-for="p in choice('often', OFTEN, 'Egal')"
            :key="p.label"
            type="button"
            :aria-pressed="p.on ? 'true' : 'false'"
            @click="pick(p)"
          >
            {{ p.label }}
          </button>
        </div>
      </fieldset>
      <fieldset>
        <legend class="label">Eher wo?</legend>
        <div class="pills">
          <button
            v-for="p in choice('where', WHERE, 'Egal')"
            :key="p.label"
            type="button"
            :aria-pressed="p.on ? 'true' : 'false'"
            @click="pick(p)"
          >
            {{ p.label }}
          </button>
        </div>
      </fieldset>
      <fieldset>
        <legend class="label">Im Bezirk</legend>
        <select
          class="field"
          aria-label="Bezirk"
          :value="state.area ?? ''"
          @change="
            emit('update', { area: ($event.target as HTMLSelectElement).value || undefined })
          "
        >
          <option value="">Alle Bezirke</option>
          <option v-for="a in meta.areas" :key="a.key" :value="a.key">{{ a.name }}</option>
        </select>
      </fieldset>
      <fieldset>
        <legend class="label">Altersgruppe</legend>
        <div class="pills">
          <button
            v-for="p in choice('age', AGES, 'Alle')"
            :key="p.label"
            type="button"
            :aria-pressed="p.on ? 'true' : 'false'"
            @click="pick(p)"
          >
            {{ p.label }}
          </button>
        </div>
      </fieldset>
    </template>

    <div v-else-if="group === 'inhalt'">
      <button
        v-for="[key, text] in CONTENT"
        :key="key"
        type="button"
        role="checkbox"
        class="check"
        :aria-checked="state.content.includes(key) ? 'true' : 'false'"
        @click="emit('update', { content: toggle(state.content, key) })"
      >
        <span class="box" aria-hidden="true"><IconCheck /></span>{{ text }}
        <small>{{ formatCount(facets.content[key] ?? 0) }}</small>
      </button>
    </div>

    <template v-else-if="group === 'wortform'">
      <div class="two">
        <label>
          Beginnt mit
          <input
            class="field"
            :value="state.starts ?? ''"
            placeholder="z. B. ab"
            :maxlength="MAX_TEXT"
            autocomplete="off"
            @change="text('starts', $event)"
          />
        </label>
        <label>
          Endet auf
          <input
            class="field"
            :value="state.ends ?? ''"
            placeholder="z. B. -ken"
            :maxlength="MAX_TEXT"
            autocomplete="off"
            @change="text('ends', $event)"
          />
        </label>
      </div>
      <label>
        Reimt sich auf
        <input
          class="field"
          :value="state.rhyme ?? ''"
          placeholder="z. B. Schrippe"
          :maxlength="MAX_TEXT"
          autocomplete="off"
          @change="text('rhyme', $event)"
        />
      </label>
      <fieldset>
        <legend class="label">Silben</legend>
        <div class="pills">
          <button
            v-for="p in choice('syllables', SYLLABLES, 'Alle')"
            :key="p.label"
            type="button"
            :aria-pressed="p.on ? 'true' : 'false'"
            @click="pick(p)"
          >
            {{ p.label }}
          </button>
        </div>
      </fieldset>
      <fieldset>
        <legend class="label">Länge</legend>
        <div class="pills">
          <button
            v-for="p in choice('length', LENGTHS, 'Alle')"
            :key="p.label"
            type="button"
            :aria-pressed="p.on ? 'true' : 'false'"
            @click="pick(p)"
          >
            {{ p.label }}
          </button>
        </div>
      </fieldset>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { facets as facetsOf } from "@lib/search/facets";
import type { SearchState } from "@lib/search/state";

import { AGES, CONTENT, LENGTHS, OFTEN, SYLLABLES, WHERE } from "@lib/search/labels";
import { computed, defineAsyncComponent } from "vue";

export type FilterGroup = "buchstabe" | "wortart" | "thema" | "gebrauch" | "inhalt" | "wortform";

const props = defineProps<{
  group: FilterGroup;
  state: SearchState;
  facets: ReturnType<typeof facetsOf>;
  meta: {
    themes: { name: string; slug: string }[];
    pos: string[];
    areas: { key: string; name: string }[];
    letters: { letter: string; count: number }[];
  };
}>();
const emit = defineEmits<{ update: [patch: Partial<SearchState>] }>();

const IconCheck = defineAsyncComponent(() => import("virtual:icons/lucide/check"));

const MAX_TEXT = 30; // same cap as the url parser

const formatCount = (n: number) => n.toLocaleString("de");
const toggle = <T>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

type Pill = { label: string; on: boolean; patch: Partial<SearchState> };
type Single = "often" | "where" | "age" | "syllables" | "length";

/** Single choice: the first pill („Egal“/„Alle“) clears the group. */
const choice = <K extends Single>(
  key: K,
  options: readonly (readonly [NonNullable<SearchState[K]>, string])[],
  all: string,
): Pill[] => [
  { label: all, on: props.state[key] === undefined, patch: { [key]: undefined } },
  ...options.map(([value, label]) => ({
    label,
    on: props.state[key] === value,
    patch: { [key]: value },
  })),
];
const pick = (p: Pill) => !p.on && emit("update", p.patch);

const text = (key: "starts" | "ends" | "rhyme", e: Event) =>
  emit("update", { [key]: (e.target as HTMLInputElement).value.trim() || undefined });

const letters = computed(() =>
  props.meta.letters
    .map(({ letter }) => ({ count: props.facets.letters[letter] ?? 0, letter }))
    .sort((a, b) => a.letter.localeCompare(b.letter, "de")),
);
</script>

<style lang="scss">
@use "@styles/components/filter-groups";
</style>
