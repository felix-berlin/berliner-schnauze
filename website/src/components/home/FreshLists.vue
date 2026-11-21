<template>
  <div class="c-home-fresh">
    <header class="head">
      <h2>Frisch uff’m Tisch</h2>
      <a class="all" href="/wort">Zum Wort-Index</a>
    </header>
    <div class="cols">
      <div v-if="newest.length >= MIN_LIST" class="new">
        <h3>Neu im Wörterbuch</h3>
        <!-- role="list": Safari drops list semantics of an unstyled list. -->
        <ul class="list" role="list">
          <li v-for="w in newest" :key="w.slug">
            <a :href="routeToWord(w.slug)">
              <b>{{ w.lemma }}</b>
              <span class="meaning">{{ w.meaning }}</span>
              <time :datetime="w.publishedAt">{{ relativeTime(new Date(w.publishedAt)) }}</time>
            </a>
          </li>
        </ul>
      </div>

      <div v-if="tabs.length" class="ranking">
        <!-- ARIA APG tabs, selection follows focus; both panels are in the HTML, without JS the first shows. -->
        <div class="tabs" role="tablist" aria-label="Wörter-Ranking">
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
        <!-- hidden="until-found": find-in-page can still reveal the other list (beforematch selects its tab). -->
        <div
          v-if="hasPopular"
          role="tabpanel"
          :hidden="current === 'popular' ? undefined : 'until-found'"
          :aria-labelledby="`${uid}-popular`"
          @beforematch="active = 'popular'"
        >
          <ol class="list" role="list" data-variant="ranked">
            <li v-for="(r, i) in popular" :key="r.word.slug">
              <a :href="routeToWord(r.word.slug)">
                <span class="rank">{{ i + 1 }}</span>
                <b>{{ r.word.berlinerisch }}</b>
                <template v-if="r.sayShare !== null">
                  <span class="dots" aria-hidden="true">
                    <i
                      v-for="n in 10"
                      :key="n"
                      :style="{ '--i': n }"
                      :data-state="n <= Math.round(r.sayShare / 10) ? 'on' : undefined"
                    />
                  </span>
                  <em class="share">{{ r.sayShare }} %</em>
                </template>
              </a>
            </li>
          </ol>
        </div>
        <div
          v-if="hasRising"
          role="tabpanel"
          :hidden="current === 'rising' ? undefined : 'until-found'"
          :aria-labelledby="`${uid}-rising`"
          @beforematch="active = 'rising'"
        >
          <ol class="list" role="list" data-variant="rising">
            <li v-for="(r, i) in rising" :key="r.word.slug">
              <a :href="routeToWord(r.word.slug)">
                <span class="rank">{{ i + 1 }}</span>
                <b>{{ r.word.berlinerisch }}</b>
                <em class="trend"><IconTrendingUp aria-hidden="true" />+{{ r.delta }}</em>
              </a>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { HomeData } from "@services/payload/home.ts";
import type { HomeStats } from "payload-app/home-stats-load";

import { routeToWord } from "@utils/helpers.ts";
import { relativeTime } from "@utils/relativeTime";
import { computed, defineAsyncComponent, ref, useId, useTemplateRef } from "vue";

const IconTrendingUp = defineAsyncComponent(() => import("virtual:icons/lucide/trending-up"));

// TODO(startseite): "Gerade beliebt" = most viewed words of the last 7 days, sayShare = share „Sag ick selbst“;
// "Im Aufwind" = largest view growth against the week before. Definitions to be confirmed (SPEC §10).
const props = defineProps<{
  newest: HomeData["newest"];
  popular: HomeStats["popular"];
  rising: HomeStats["rising"];
}>();

// SPEC §19: a list with fewer than three entries drops.
const MIN_LIST = 3;

type Key = "popular" | "rising";
const uid = useId();
const active = ref<Key>("popular");
const tabEls = useTemplateRef<HTMLButtonElement[]>("tabEls");

const hasPopular = computed(() => props.popular.length >= MIN_LIST);
const hasRising = computed(() => props.rising.length >= MIN_LIST);
const tabs = computed(() =>
  [
    { key: "popular" as Key, label: "Gerade beliebt", show: hasPopular.value },
    { key: "rising" as Key, label: "Im Aufwind", show: hasRising.value },
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
@use "@styles/components/home-fresh";
</style>
