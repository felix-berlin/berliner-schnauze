<template>
  <div class="c-bon-leaderboard">
    <div class="inner">
      <header class="header">
        <a class="c-textlink" href="/games/berliner-oder-nicht"> ← Berliner oder nicht? </a>
        <div class="titlebar">
          <h1 class="c-band">Rangliste</h1>
          <span class="t-small">{{ totalLabel }}</span>
        </div>
        <div class="periods" role="group" aria-label="Zeitraum">
          <button
            v-for="p in PERIODS"
            :key="p.id"
            class="c-choice"
            type="button"
            :aria-pressed="p.id === period ? 'true' : 'false'"
            @click="pick(p.id)"
          >
            {{ p.label }}
          </button>
        </div>
      </header>

      <div class="columns">
        <section
          class="c-section-card c-bon-ranking"
          :data-variant="isDesktop ? 'sheet table' : 'sheet'"
          aria-labelledby="bon-leaderboard-title"
        >
          <h2 id="bon-leaderboard-title" class="u-sr-only">{{ periodTitle }}</h2>

          <div
            v-if="status === 'loading'"
            class="skeleton"
            aria-busy="true"
            aria-label="Rangliste wird jeladen"
          >
            <span v-for="n in 8" :key="n" class="skeleton-row">
              <span class="c-skeleton" />
              <span class="c-skeleton" :style="{ inlineSize: `${SKELETON_WIDTHS[n - 1]}%` }" />
              <span class="c-skeleton" />
            </span>
          </div>

          <div v-else-if="status === 'error'" class="pad">
            <div class="c-state" data-variant="error" role="alert">
              <AlertIcon width="18" height="18" aria-hidden="true" />
              <span class="body">
                <b>Ditt hat nich jeklappt.</b>
                <span>Die Rangliste is jerade nich zu kriegen.</span>
                <span class="actions">
                  <button class="c-choice" type="button" @click="load()">Nochmal versuchen</button>
                </span>
              </span>
            </div>
          </div>

          <div v-else-if="!entries.length" class="empty">
            <b>{{
              listed === "week"
                ? "Diese Woche hat noch keener jespielt."
                : "Noch keene Spiele in dem Zeitraum."
            }}</b>
            <span>Hier könnte dein Name stehen.</span>
            <span class="play">
              <a class="c-button" data-variant="primary lg" :href="GAME_PATH">Jetzt spielen</a>
            </span>
          </div>

          <template v-else>
            <div class="body">
              <div v-if="isDesktop" class="row" data-kind="head" aria-hidden="true">
                <span class="metric">Platz</span>
                <span>Name</span>
                <span class="metric">Treffer</span>
                <span class="metric">Serie</span>
                <span class="metric">Wann</span>
                <span class="metric">Punkte</span>
              </div>
              <ol class="list" :aria-label="periodTitle">
                <template v-for="item in items" :key="item.gap ? 'gap' : item.entry.rank">
                  <li v-if="item.gap" class="gap" aria-hidden="true">···</li>
                  <li v-else>
                    <div class="row" :aria-current="item.entry.isMe ? 'true' : undefined">
                      <span class="rank" :data-state="item.entry.rank <= 3 ? 'top' : undefined">
                        <span class="u-sr-only">Platz</span> {{ item.entry.rank }}
                      </span>
                      <span class="name">
                        <span class="who">
                          <b>{{ item.entry.name }}</b>
                          <span v-if="item.entry.tag" class="tag">#{{ item.entry.tag }}</span>
                          <span v-if="item.entry.isMe" class="you">du</span>
                        </span>
                        <span v-if="!isDesktop" class="t-small">
                          {{ item.entry.accuracy }} % · Serie {{ item.entry.bestStreak }}
                        </span>
                        <template v-if="reporting && !item.entry.isMe">
                          <span v-if="reported.includes(item.entry.id)" class="t-small"
                            >Jemeldet, danke!</span
                          >
                          <button
                            v-else
                            class="c-textlink"
                            type="button"
                            :aria-label="`${item.entry.name}${item.entry.tag ? ` #${item.entry.tag}` : ''} melden`"
                            @click="report(item.entry.id)"
                          >
                            Melden
                          </button>
                        </template>
                      </span>
                      <template v-if="isDesktop">
                        <span class="metric">{{ item.entry.accuracy }} %</span>
                        <span class="metric">{{ item.entry.bestStreak }}</span>
                        <span class="metric t-small">{{ relativeDay(item.entry.finishedAt) }}</span>
                      </template>
                      <span class="score">{{ fmt(item.entry.score) }}</span>
                    </div>
                  </li>
                </template>
              </ol>
            </div>
            <div class="footer">
              <span>Platz 1–{{ shown.length }} von {{ fmt(total) }}</span>
              <button
                v-if="shown.length < total"
                class="c-textlink"
                data-variant="inline"
                type="button"
                :aria-disabled="loadingMore ? 'true' : undefined"
                @click="more"
              >
                Mehr laden
              </button>
              <span v-if="moreError" class="t-small" role="alert">{{ moreError }}</span>
            </div>
          </template>
        </section>

        <aside
          v-if="status !== 'error' && status !== 'loading'"
          class="aside"
          :data-state="me ? undefined : 'first'"
        >
          <section
            class="c-section-card c-bon-me"
            data-variant="sheet"
            aria-labelledby="bon-lb-me-title"
          >
            <div class="header">
              <h2 id="bon-lb-me-title" class="title">Dein Platz</h2>
            </div>
            <div class="body">
              <div class="me">
                <template v-if="me">
                  <p class="place">
                    <b>{{ me.rank }}.</b>
                    <span class="t-small">von {{ fmt(total) }} · besser als {{ betterThan }}</span>
                  </p>
                  <p>
                    <b>{{ fmt(me.score) }} Punkte</b> · {{ me.accuracy }} % Treffer · Serie
                    {{ me.bestStreak }}
                  </p>
                  <span class="links">
                    <button class="c-textlink" type="button" @click="jump">Zu mir springen</button>
                    <a class="c-textlink" :href="GAME_PATH">Nochmal spielen</a>
                  </span>
                  <BonName v-if="player" :name="player.name" :tag="player.tag" @saved="onSaved" />
                  <p class="t-small">
                    Gezählt wird dein bestes Spiel im Zeitraum. Erkannt wirst du an einem Cookie auf
                    diesem Jerät.
                  </p>
                </template>
                <template v-else>
                  <p>
                    Du stehst hier noch nich drin. Spiel ’ne Runde, dann siehste, wo du landest.
                  </p>
                  <span class="play">
                    <a class="c-button" data-variant="primary lg" :href="GAME_PATH"
                      >Jetzt spielen</a
                    >
                  </span>
                  <p class="t-small">
                    Schon jespielt? Dann is der Cookie weg oder du spielst auf ’nem anderen Jerät.
                  </p>
                  <BonPlayerCode v-if="redeeming" mode="redeem" @close="redeemed" />
                  <span v-else class="redeem">
                    <button class="c-textlink" type="button" @click="redeeming = true">
                      <KeyIcon width="18" height="18" aria-hidden="true" />
                      <span>Spielercode einlösen</span>
                    </button>
                  </span>
                </template>
              </div>
            </div>
          </section>
          <p class="t-small note">
            Namen sind frei jewählt. Anstößige Namen blenden wa aus.
            <button
              class="c-textlink"
              data-variant="inline"
              type="button"
              :aria-pressed="reporting ? 'true' : 'false'"
              @click="reporting = !reporting"
            >
              Namen melden
            </button>
          </p>
          <p v-if="reportError" class="t-small note" role="alert">
            {{ reportError }}
          </p>
        </aside>
      </div>

      <div
        v-if="!isDesktop && me && status === 'ready' && entries.length"
        class="sticky"
        role="region"
        aria-label="Dein Platz"
      >
        <b class="sticky-rank">{{ me.rank }}.</b>
        <span class="sticky-text">
          <b>Du · {{ fmt(me.score) }} Punkte</b>
          <span class="t-small">von {{ fmt(total) }} · besser als {{ betterThan }}</span>
        </span>
        <span class="sticky-jump">
          <button class="c-textlink" type="button" @click="jump">Zu mir</button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LeaderboardReply, Period, PublicEntry } from "@services/bonLeaderboardApi";

import BonName from "@components/games/BonName.vue";
import BonPlayerCode from "@components/games/BonPlayerCode.vue";
import { fetchLeaderboard, reportName } from "@services/bonLeaderboardApi";
import { fetchPlayerName, type PlayerName } from "@services/bonPlayerApi.ts";
import { navigationSettled, vt } from "@utils/viewTransition";
import { useLocalStorage, useMediaQuery } from "@vueuse/core";
import AlertIcon from "virtual:icons/lucide/circle-alert";
import KeyIcon from "virtual:icons/lucide/key";
import { computed, onMounted, ref } from "vue";

const GAME_PATH = "/games/berliner-oder-nicht";
const PAGE = 25;
const MOBILE_TOP = 10;
const SKELETON_WIDTHS = [60, 45, 70, 52, 38, 66, 48, 58];
const PERIODS: { id: Period; label: string; meta: string }[] = [
  { id: "week", label: "Diese Woche", meta: "diese Woche" },
  { id: "month", label: "Diesen Monat", meta: "diesen Monat" },
  { id: "all", label: "Allzeit", meta: "Allzeit" },
];

type Item = { gap: true } | { gap?: false; entry: PublicEntry };

// Same 808px as mx.breakpoint("word") in the stylesheet.
const isDesktop = useMediaQuery("(min-width: 808px)");

const period = ref<Period>("week");
// The period the list shows: it trails `period` while a switch is loading behind the old list.
const listed = ref<Period>("week");
const status = ref<"loading" | "ready" | "error">("loading");
const entries = ref<PublicEntry[]>([]);
const total = ref(0);
const me = ref<LeaderboardReply["me"]>();
const expanded = ref(false);
const loadingMore = ref(false);
const redeeming = ref(false);
const player = ref<PlayerName>();
const reporting = ref(false);
const reportError = ref("");
const moreError = ref("");
// Without storage a name can be reported again after a reload; the server counts it once.
const reported = useLocalStorage<number[]>("bs-reported-bon-names", []);

const fmt = (n: number) => n.toLocaleString("de-DE");
const current = computed(() => PERIODS.find((p) => p.id === listed.value)!);
const periodTitle = computed(() => `Rangliste ${current.value.label}`);
const totalLabel = computed(() => {
  if (status.value !== "ready") return "";
  return total.value
    ? `${fmt(total.value)} ${total.value === 1 ? "Spiel" : "Spiele"} · ${current.value.meta}`
    : "Noch keene Spiele";
});
const betterThan = computed(
  () => `${me.value ? Math.round(((total.value - me.value.rank) / total.value) * 100) : 0} %`,
);

// Mobile shows the top 10 until "Mehr laden" is pressed; desktop shows everything loaded.
const shown = computed(() =>
  isDesktop.value || expanded.value ? entries.value : entries.value.slice(0, MOBILE_TOP),
);
// Behind the list: the own row with one neighbour each side, after a gap when it is not next in line.
const items = computed<Item[]>(() => {
  const list: Item[] = shown.value.map((entry) => ({ entry }));
  const mine = me.value;
  if (!mine) return list;
  const last = shown.value.at(-1)?.rank ?? 0;
  const extra = mine.around.filter((e) => Math.abs(e.rank - mine.rank) <= 1 && e.rank > last);
  if (extra[0] && extra[0].rank > last + 1) list.push({ gap: true });
  return list.concat(extra.map((entry) => ({ entry })));
});

// Latest request wins: a slow reply of the period the visitor left must not overwrite the list.
let request = 0;
async function load(keepList = false): Promise<void> {
  const mine = ++request;
  const asked = period.value;
  if (!keepList) status.value = "loading";
  try {
    const data = await fetchLeaderboard(asked, 0, PAGE);
    if (mine !== request) return;
    // The morph from the result lands on the skeleton row; the rows wait until it is over (Spec §13, `bon-me`).
    await navigationSettled();
    if (mine !== request) return;
    const apply = () => {
      entries.value = data.entries;
      total.value = data.total;
      me.value = data.me;
      listed.value = asked;
      expanded.value = false;
      status.value = "ready";
    };
    // A period switch keeps the old list up and swaps it in a transition (Spec §13).
    if (keepList) vt(apply, "period");
    else apply();
  } catch {
    if (mine === request) status.value = "error";
  }
}

async function more(): Promise<void> {
  if (loadingMore.value) return;
  if (shown.value.length < entries.value.length) {
    expanded.value = true;
    return;
  }
  const mine = request;
  loadingMore.value = true;
  moreError.value = "";
  try {
    const data = await fetchLeaderboard(period.value, entries.value.length, PAGE);
    if (mine === request) {
      entries.value = entries.value.concat(data.entries);
      // An empty page although the total says more: stop offering "Mehr laden".
      if (!data.entries.length) total.value = entries.value.length;
    }
  } catch {
    if (mine === request) moreError.value = "Die Rangliste is jerade nich zu kriegen.";
  } finally {
    loadingMore.value = false;
  }
}

function pick(next: Period): void {
  if (next === period.value) return;
  period.value = next;
  void load(status.value === "ready" && entries.value.length > 0);
}

function redeemed(): void {
  redeeming.value = false;
  void load();
}

function jump(): void {
  document
    .querySelector('.c-bon-leaderboard [aria-current="true"]')
    ?.scrollIntoView({ block: "center" });
}

async function report(id: number): Promise<void> {
  reportError.value = "";
  try {
    await reportName(id);
  } catch (error) {
    // 404: the game is gone, so there is nothing left to report; any other error stays retryable.
    if ((error as { status?: number }).status !== 404) {
      reportError.value = (error as Error).message;
      return;
    }
  }
  reported.value = [...reported.value, id];
}

const rtf = new Intl.RelativeTimeFormat("de", { numeric: "auto" });
function relativeDay(iso: string): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date(iso)) - startOfDay(new Date())) / 86_400_000);
  if (days > -14) return rtf.format(days, "day");
  if (days > -60) return rtf.format(Math.round(days / 7), "week");
  if (days > -730) return rtf.format(Math.round(days / 30), "month");
  return rtf.format(Math.round(days / 365), "year");
}

// Only a failed or missing name hides the editor; the list works without it.
async function loadPlayer(): Promise<void> {
  try {
    player.value = await fetchPlayerName();
  } catch (error) {
    // The board works without the own name; only the rename editor stays out.
    console.warn("[bon] own name not loaded:", error);
    player.value = undefined;
  }
}

// The saved name shows in every row of the list, so it is fetched again.
function onSaved(saved: PlayerName): void {
  player.value = saved;
  void load(true);
}

onMounted(() => {
  void load();
  void loadPlayer();
});
</script>

<style lang="scss">
@use "@styles/components/bon-leaderboard";
@use "@styles/components/bon-ranking";
@use "@styles/components/bon-me";
@use "@styles/objects/bon-leaderboard-motion";
</style>
