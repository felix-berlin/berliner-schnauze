<template>
  <div
    v-if="pills.length"
    ref="root"
    class="c-active-filters"
    role="group"
    aria-label="Aktive Filter"
  >
    <div class="inner">
      <span class="label" aria-hidden="true">Aktiv</span>
      <button
        v-for="(p, i) in pills"
        :key="`${p.group} ${p.value}`"
        type="button"
        class="pill"
        data-pill
        :aria-label="`Filter entfernen: ${p.group} ${p.value}`"
        @click="remove(i)"
      >
        {{ p.group }}: <b>{{ p.value }}</b><span class="x" aria-hidden="true"><IconX /></span>
      </button>
      <button type="button" class="reset" @click="emit('reset')">Alles zurücksetzen</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SearchState } from "@lib/search/state";

import { AGES, CONTENT, LENGTHS, OFTEN, SYLLABLES, WHERE, label } from "@lib/search/labels";
import { computed, defineAsyncComponent, nextTick, useTemplateRef } from "vue";

const props = defineProps<{
  state: SearchState;
  meta: { themes: { name: string; slug: string }[]; areas: { key: string; name: string }[] };
}>();
const emit = defineEmits<{ update: [patch: Partial<SearchState>]; reset: [] }>();

const IconX = defineAsyncComponent(() => import("virtual:icons/lucide/x"));

type Pill = { group: string; value: string; patch: Partial<SearchState> };

/** SPEC §7.3: one pill per value, in chip order. */
const pills = computed(() => {
  const s = props.state;
  const out: Pill[] = [];
  const without = <T>(list: T[], v: T) => list.filter((x) => x !== v);
  if (s.letter) out.push({ group: "Buchstabe", patch: { letter: undefined }, value: s.letter });
  for (const p of s.pos)
    out.push({ group: "Wortart", patch: { pos: without(s.pos, p) }, value: p });
  for (const t of s.themes)
    out.push({
      group: "Thema",
      patch: { themes: without(s.themes, t) },
      value: props.meta.themes.find((x) => x.slug === t)?.name ?? t,
    });
  if (s.often)
    out.push({ group: "Gebrauch", patch: { often: undefined }, value: label(OFTEN, s.often) });
  if (s.where)
    out.push({ group: "Gebrauch", patch: { where: undefined }, value: label(WHERE, s.where) });
  if (s.area)
    out.push({
      group: "Bezirk",
      patch: { area: undefined },
      value: props.meta.areas.find((a) => a.key === s.area)?.name ?? s.area,
    });
  if (s.age) out.push({ group: "Alter", patch: { age: undefined }, value: label(AGES, s.age) });
  for (const k of s.content)
    out.push({
      group: "Inhalt",
      patch: { content: without(s.content, k) },
      value: label(CONTENT, k),
    });
  if (s.starts) out.push({ group: "Beginnt mit", patch: { starts: undefined }, value: s.starts });
  if (s.ends) out.push({ group: "Endet auf", patch: { ends: undefined }, value: s.ends });
  if (s.rhyme) out.push({ group: "Reimt sich auf", patch: { rhyme: undefined }, value: s.rhyme });
  if (s.syllables)
    out.push({
      group: "Silben",
      patch: { syllables: undefined },
      value: label(SYLLABLES, s.syllables),
    });
  if (s.length)
    out.push({ group: "Länge", patch: { length: undefined }, value: label(LENGTHS, s.length) });
  if (s.berolinismus)
    out.push({ group: "Nur", patch: { berolinismus: false }, value: "Berolinismen" });
  return out;
});

const root = useTemplateRef("root");

// The removed pill takes focus with it: hand it to the pill now in its place, else the reset link.
async function remove(i: number) {
  emit("update", pills.value[i]!.patch);
  await nextTick();
  const left = root.value?.querySelectorAll<HTMLElement>("[data-pill]");
  (
    left?.[i] ??
    left?.[i - 1] ??
    root.value?.querySelector<HTMLElement>("[data-pill] ~ button")
  )?.focus();
}
</script>

<style lang="scss">
@use "@styles/components/active-filters";
</style>
