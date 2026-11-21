<template>
  <!-- Dark band in both themes (SPEC §4.3, §11); drops when neither tab has data. -->
  <div v-if="tabs.length" class="c-home-results" data-theme="dark">
    <header class="head">
      <p class="eyebrow" aria-hidden="true"><s>Wo wird noch Berlinerisch gesprochen?</s></p>
      <h2>Wo wird noch berlinert?</h2>
      <p class="sub">
        Bei jedem Wort fragen wir: Sagste dit selbst noch? Aus den Antworten sehen wir, wo und von
        wem Berlinerisch heute noch gesprochen wird.
      </p>
    </header>

    <!-- ARIA APG tabs as in FreshLists: selection follows focus, both panels in the HTML, without JS the first shows. -->
    <div class="tabs" role="tablist" aria-label="Umfrage-Ergebnisse">
      <button
        v-for="(t, i) in tabs"
        :id="`${uid}-${t.key}`"
        :key="t.key"
        ref="tabEls"
        role="tab"
        type="button"
        :aria-selected="t.key === current"
        :tabindex="t.key === current ? 0 : -1"
        @click="active = t.key"
        @keydown="onKey($event, i)"
      >
        {{ t.label }}
      </button>
    </div>

    <div
      v-if="hasDistricts"
      role="tabpanel"
      class="districts"
      :hidden="current === 'district' ? undefined : 'until-found'"
      :aria-labelledby="`${uid}-district`"
      @beforematch="active = 'district'"
    >
      <div class="ranking">
        <p class="legend">
          <span>wenig berlinert</span>
          <i v-for="n in 4" :key="n" aria-hidden="true" />
          <span>viel berlinert</span>
        </p>
        <p class="label">Am meisten berlinert</p>
        <!-- role="list": Safari drops list semantics of an unstyled list. -->
        <ul class="rank" role="list">
          <li v-for="d in top" :key="d.area">
            <span>{{ d.name }}</span>
            <b>{{ d.value }} %</b>
          </li>
        </ul>
        <template v-if="bottom.length">
          <p class="label">Am wenigsten</p>
          <ul class="rank" role="list">
            <li v-for="d in bottom" :key="d.area">
              <span>{{ d.name }}</span>
              <b>{{ d.value }} %</b>
            </li>
          </ul>
        </template>
        <p class="fine">Karte: Geoportal Berlin / ALKIS Berlin Bezirke</p>
      </div>
      <DotMap :districts="districts" :geometry="geometry" />
    </div>

    <div
      v-if="hasAges"
      role="tabpanel"
      class="ages"
      :hidden="current === 'age' ? undefined : 'until-found'"
      :aria-labelledby="`${uid}-age`"
      @beforematch="active = 'age'"
    >
      <p class="sub">
        Welche Wörter sagen nur noch Ältere, welche auch Junge? Jeder Punkt steht für 10 % der
        Stimmen „Sag ick selbst“, aufgeteilt auf vier Altersgruppen.
      </p>
      <div class="cols">
        <div v-for="l in ageCols" :key="l.variant">
          <h3>{{ l.title }}</h3>
          <ul class="list" role="list">
            <li v-for="w in l.words" :key="w.word.slug">
              <a :href="routeToWord(w.word.slug)">
                <span class="word">
                  <b>{{ w.word.berlinerisch }}</b>
                  <small v-if="w.meaning">{{ w.meaning }}</small>
                </span>
                <AgeDots :by-group="w.byGroup" :variant="l.variant" />
              </a>
            </li>
          </ul>
        </div>
      </div>
      <p class="axis">
        Spalten von links nach rechts, ein Punkt je 10 %: unter 30 · 30–49 · 50–69 · 70+ · nur
        Gruppen ab 10 Stimmen
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Geometry } from "@utils/dotMap.ts";
import type { HomeStats } from "payload-app/home-stats-load";

import geometryJson from "@assets/berlin-bezirke-punkte.json";
import AgeDots from "@components/home/AgeDots.vue";
import DotMap from "@components/home/DotMap.vue";
import { routeToWord } from "@utils/helpers.ts";
import { computed, ref, useId, useTemplateRef } from "vue";

// MIN_GROUP is applied server-side: a district below it has value null, an age group null, a word is missing.
const props = defineProps<{
  districts: HomeStats["districts"];
  ageLists: HomeStats["ageLists"];
}>();

const geometry: Geometry = geometryJson;

type Key = "district" | "age";
const uid = useId();
const active = ref<Key>("district");
const tabEls = useTemplateRef<HTMLButtonElement[]>("tabEls");

const ranked = computed(() =>
  props.districts
    .filter((d): d is typeof d & { value: number } => d.value !== null)
    .toSorted((a, b) => b.value - a.value),
);
const top = computed(() => ranked.value.slice(0, 3));
const bottom = computed(() => ranked.value.slice(3).slice(-2));

const hasDistricts = computed(() => ranked.value.length > 0);
const hasAges = computed(() => props.ageLists.dying.length + props.ageLists.growing.length > 0);
const ageCols = computed(() =>
  [
    { title: "Stirbt langsam aus", variant: "dying" as const, words: props.ageLists.dying },
    { title: "Lebt und wächst", variant: "growing" as const, words: props.ageLists.growing },
  ].filter((l) => l.words.length),
);

const tabs = computed(() =>
  [
    { key: "district" as Key, label: "Nach Bezirk", show: hasDistricts.value },
    { key: "age" as Key, label: "Nach Alter", show: hasAges.value },
  ].filter((t) => t.show),
);
// A dropped tab can never stay selected.
const current = computed(() =>
  tabs.value.some((t) => t.key === active.value) ? active.value : tabs.value[0]?.key,
);

const onKey = (e: KeyboardEvent, i: number) => {
  const last = tabs.value.length - 1;
  const next = {
    ArrowLeft: i ? i - 1 : last,
    ArrowRight: i < last ? i + 1 : 0,
    End: last,
    Home: 0,
  }[e.key];
  if (next === undefined) return;
  e.preventDefault();
  active.value = tabs.value[next]!.key;
  tabEls.value?.[next]?.focus();
};
</script>

<style lang="scss">
@use "@styles/components/home-results";
</style>
