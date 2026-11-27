<template>
  <div ref="root" class="c-filter-bar" role="group" aria-label="Filter">
    <div class="chips">
      <template v-for="c in chips" :key="c.group">
        <button
          type="button"
          class="chip"
          :popovertarget="`filter-${c.group}`"
          :aria-expanded="open === c.group ? 'true' : 'false'"
          data-chip
          :data-active="groupFilterCount(state, c.group) > 0 || undefined"
        >
          {{ c.title }}
          <span v-if="groupFilterCount(state, c.group)" class="count" data-count>{{
            groupFilterCount(state, c.group)
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
    </div>
    <div class="sort">
      <SortSelect :state="state" :compact="crowded" @update="emit('update', $event)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { facets as facetsOf } from "@lib/search/facets";

import {
  groupFilterCount,
  visibleGroups,
  type FilterGroup,
  type SearchState,
} from "@lib/search/state";
import { computed, defineAsyncComponent, ref, useTemplateRef } from "vue";

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

// SPEC §6.4: in the start state the register replaces the „Buchstabe“ chip.
const chips = computed(() => visibleGroups(props.state));

// From 4 active chips (count pills, bold labels) the „Sortieren“ text no longer fits beside them at 1160px.
const crowded = computed(
  () =>
    chips.value.filter((c) => groupFilterCount(props.state, c.group)).length +
      (props.state.berolinismus ? 1 : 0) >=
    4,
);

const countText = computed(
  () => `${props.total.toLocaleString("de")} ${props.total === 1 ? "Wort passt" : "Wörter passen"}`,
);

const open = ref<FilterGroup>();
const root = useTemplateRef("root");

/** Stable focus target when the element that had focus goes away (e.g. the last active filter). */
const focus = () => root.value?.querySelector<HTMLElement>("[data-chip]")?.focus();
defineExpose({ focus });
const onToggle = (group: FilterGroup, isOpen: boolean) => {
  if (isOpen) open.value = group;
  else if (open.value === group) open.value = undefined;
};
</script>

<style lang="scss">
@use "@styles/components/filter-bar";
</style>
