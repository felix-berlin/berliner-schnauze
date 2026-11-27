<template>
  <div class="c-filter-sheet">
    <button ref="opener" type="button" class="open" aria-haspopup="dialog" @click="open">
      <IconFilter class="icon" aria-hidden="true" />Filter
      <span v-if="count" class="count" data-count>{{ count }}</span>
    </button>

    <dialog
      ref="dialog"
      class="sheet"
      closedby="any"
      aria-labelledby="filter-sheet-title"
      :style="drag ? { translate: `0 ${drag}px`, transition: 'none' } : undefined"
      @click="onClick"
    >
      <div
        class="grip"
        aria-hidden="true"
        data-grip
        @pointerdown="dragStart"
        @pointermove="dragMove"
        @pointerup="dragEnd(true)"
        @pointercancel="dragEnd(false)"
      />
      <div class="head">
        <h2 id="filter-sheet-title" class="title" tabindex="-1" autofocus>Filter</h2>
        <button type="button" class="close" aria-label="Filter schließen" @click="close">
          <IconX aria-hidden="true" />
        </button>
      </div>

      <div class="body">
        <BaseAccordion>
          <AccordionItem v-for="g in groups" :key="g.group" :open="g.group === 'gebrauch'">
            <AccordionTrigger>
              <SheetGroupLabel :title="g.title" :summary="summary(g.group)" />
            </AccordionTrigger>
            <AccordionContent>
              <FilterGroups
                :group="g.group"
                :state="state"
                :facets="facets"
                :meta="meta"
                @update="emit('update', $event)"
              />
            </AccordionContent>
          </AccordionItem>
        </BaseAccordion>
        <button
          type="button"
          role="switch"
          class="switch"
          :aria-checked="state.berolinismus ? 'true' : 'false'"
          @click="emit('update', { berolinismus: !state.berolinismus })"
        >
          <span class="box" aria-hidden="true"><IconCheck /></span>Nur Berolinismen
        </button>
      </div>

      <div class="foot">
        <button type="button" class="reset" @click="emit('reset')">Zurücksetzen</button>
        <!-- Filters apply live (SPEC §7.5): this only closes. -->
        <button type="button" class="show" @click="close">{{ showText }}</button>
      </div>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import type { facets as facetsOf } from "@lib/search/facets";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  BaseAccordion,
} from "@components/accordion";
import { AGES, LENGTHS, OFTEN, SYLLABLES, WHERE, label } from "@lib/search/labels";
import {
  activeFilterCount,
  groupFilterCount,
  visibleGroups,
  type FilterGroup,
  type SearchState,
} from "@lib/search/state";
import { useResizeObserver } from "@vueuse/core";
import { computed, defineAsyncComponent, ref, useTemplateRef } from "vue";

import FilterGroups from "./FilterGroups.vue";
import SheetGroupLabel from "./SheetGroupLabel.vue";

const props = defineProps<{
  state: SearchState;
  facets: ReturnType<typeof facetsOf>;
  /** Hits with the current filters, for „{n} Wörter zeigen“. */
  total: number;
  meta: InstanceType<typeof FilterGroups>["$props"]["meta"];
}>();
const emit = defineEmits<{
  update: [patch: Partial<SearchState>];
  reset: [];
  /** Closed because the button went away (desktop width): focus needs a new home. */
  hidden: [];
}>();

const IconCheck = defineAsyncComponent(() => import("virtual:icons/lucide/check"));
const IconFilter = defineAsyncComponent(() => import("virtual:icons/lucide/sliders-horizontal"));
const IconX = defineAsyncComponent(() => import("virtual:icons/lucide/x"));

const DRAG_CLOSE = 80; // px pulled down that close the sheet

const groups = computed(() => visibleGroups(props.state));
const count = computed(() => activeFilterCount(props.state));
/** With one value from a single-choice field the summary names it („Oft“), like the mock. */
const single = (group: FilterGroup): string | undefined => {
  const s = props.state;
  if (group === "gebrauch") {
    if (s.often) return label(OFTEN, s.often);
    if (s.where) return label(WHERE, s.where);
    if (s.area) return props.meta.areas.find((a) => a.key === s.area)?.name ?? s.area;
    if (s.age) return label(AGES, s.age);
  }
  if (group === "wortform") {
    if (s.syllables) return label(SYLLABLES, s.syllables);
    if (s.length) return label(LENGTHS, s.length);
  }
};
const summary = (group: FilterGroup) => {
  const n = groupFilterCount(props.state, group);
  if (n === 1) return single(group) ?? "1 gewählt";
  if (n) return `${n} gewählt`;
  return group === "gebrauch" ? "Egal" : "Alle";
};
const showText = computed(
  () => `${props.total.toLocaleString("de")} ${props.total === 1 ? "Wort" : "Wörter"} zeigen`,
);

const dialog = useTemplateRef("dialog");
const opener = useTemplateRef("opener");
const open = () => dialog.value?.showModal();
const close = () => dialog.value?.close();

// Turning a phone to landscape hides the button (desktop bar): a hidden modal would leave the page inert.
useResizeObserver(opener, ([e]) => {
  if (!e || e.contentRect.width || !dialog.value?.open) return;
  close();
  emit("hidden");
});

// closedby="any" is missing in Safari: a click on the backdrop lands on the dialog outside its box.
function onClick(e: MouseEvent) {
  const el = dialog.value;
  if (!el || e.target !== el) return;
  const r = el.getBoundingClientRect();
  if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right)
    close();
}

/* Pull down on the grip to close (SPEC §7.5). */
const drag = ref(0);
let startY: number | undefined;
function dragStart(e: PointerEvent) {
  startY = e.clientY;
  (e.currentTarget as Element).setPointerCapture(e.pointerId);
}
function dragMove(e: PointerEvent) {
  if (startY !== undefined) drag.value = Math.max(0, e.clientY - startY);
}
function dragEnd(release: boolean) {
  if (release && drag.value > DRAG_CLOSE) close();
  drag.value = 0;
  startY = undefined;
}

/** Focus target when the last filter goes away below 808px (the desktop bar is hidden there). */
const focus = () => opener.value?.focus();
defineExpose({ focus });
</script>

<style lang="scss">
@use "@styles/components/filter-sheet";
</style>
