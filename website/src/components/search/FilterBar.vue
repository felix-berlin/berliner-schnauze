<template>
  <div class="c-filter-bar" role="group" aria-label="Filter">
    <template v-for="c in chips" :key="c.group">
      <button
        type="button"
        class="chip"
        :popovertarget="`filter-${c.group}`"
        :aria-expanded="open === c.group ? 'true' : 'false'"
        :data-active="count(state, c.group) > 0 || undefined"
      >
        {{ c.title }}
        <span v-if="count(state, c.group)" class="count" data-count>{{
          count(state, c.group)
        }}</span>
        <IconChevron class="chevron" aria-hidden="true" />
      </button>
      <FilterPopover
        :id="`filter-${c.group}`"
        :title="c.title"
        :intro="c.intro"
        :count="countText"
        @toggle="onToggle(c.group, $event)"
      >
        <FilterGroups
          :group="c.group"
          :state="state"
          :facets="facets"
          :meta="meta"
          @update="emit('update', $event)"
        />
      </FilterPopover>
    </template>
    <button
      type="button"
      class="chip"
      :aria-pressed="state.berolinismus ? 'true' : 'false'"
      title="Nur Berliner Spitznamen für Orte, Straßen und Plätze"
      @click="emit('update', { berolinismus: !state.berolinismus })"
    >
      <IconCheck class="tick" aria-hidden="true" />Nur Berolinismen
    </button>
    <div class="sort"><SortSelect :state="state" @update="emit('update', $event)" /></div>
  </div>
</template>

<script setup lang="ts">
import type { FilterGroup } from "@components/search/FilterGroups.vue";
import type { facets as facetsOf } from "@lib/search/facets";

import { showsLetterChip, type SearchState } from "@lib/search/state";
import { computed, defineAsyncComponent, ref } from "vue";

import FilterGroups from "./FilterGroups.vue";
import FilterPopover from "./FilterPopover.vue";
import SortSelect from "./SortSelect.vue";

const props = defineProps<{
  state: SearchState;
  facets: ReturnType<typeof facetsOf>;
  /** Hits with the current filters, for „{n} Wörter passen“. */
  total: number;
  meta: InstanceType<typeof FilterGroups>["$props"]["meta"];
}>();
const emit = defineEmits<{ update: [patch: Partial<SearchState>] }>();

const IconCheck = defineAsyncComponent(() => import("virtual:icons/lucide/check"));
const IconChevron = defineAsyncComponent(() => import("virtual:icons/lucide/chevron-down"));

// SPEC §7.1 order and §7.2 copy.
const GROUPS: { group: FilterGroup; title: string; intro: string }[] = [
  {
    group: "buchstabe",
    intro: "Springt zu allen Wörtern mit diesem Anfangsbuchstaben.",
    title: "Buchstabe",
  },
  {
    group: "wortart",
    intro: "Mehrere möglich. Redewendungen haben eigene Wortart.",
    title: "Wortart",
  },
  { group: "thema", intro: "Mehrere möglich.", title: "Thema" },
  {
    group: "gebrauch",
    intro: "Aus der Umfrage „Sagste det noch?“. Zählt nur Wörter mit mindestens 10 Stimmen.",
    title: "Gebrauch",
  },
  {
    group: "inhalt",
    intro:
      "Zeigt nur Wörter, die dit schon haben. „Hier fehlt noch wat“ zeigt Wörter zum Mitmachen.",
    title: "Inhalt",
  },
  { group: "wortform", intro: "Für Rätsel, Reime und Wortspiele.", title: "Wortform" },
];

const count = (s: SearchState, group: FilterGroup): number => {
  switch (group) {
    case "buchstabe":
      return s.letter ? 1 : 0;
    case "wortart":
      return s.pos.length;
    case "thema":
      return s.themes.length;
    case "gebrauch":
      return [s.often, s.where, s.area, s.age].filter(Boolean).length;
    case "inhalt":
      return s.content.length;
    case "wortform":
      return [s.starts, s.ends, s.rhyme, s.syllables, s.length].filter(Boolean).length;
  }
};

// SPEC §6.4: in the start state the register replaces the „Buchstabe“ chip.
const chips = computed(() =>
  GROUPS.filter((g) => g.group !== "buchstabe" || showsLetterChip(props.state)),
);

const countText = computed(
  () => `${props.total.toLocaleString("de")} ${props.total === 1 ? "Wort passt" : "Wörter passen"}`,
);

const open = ref<FilterGroup>();
const onToggle = (group: FilterGroup, isOpen: boolean) => {
  if (isOpen) open.value = group;
  else if (open.value === group) open.value = undefined;
};
</script>

<style lang="scss">
@use "@styles/components/filter-bar";
</style>
