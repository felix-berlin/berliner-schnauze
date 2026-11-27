<template>
  <!-- The live region stands from mount on; the block inside changes (SPEC §8.3, design doc A11y). -->
  <div ref="root" class="c-semantic-search" aria-live="polite">
    <section v-if="mode !== 'aus'" class="block" aria-labelledby="ki-title">
      <div class="head">
        <span class="icon"><IconSparkles aria-hidden="true" /></span>
        <div>
          <h2 id="ki-title">{{ copy[0] }}</h2>
          <p>{{ copy[1] }}</p>
        </div>
      </div>

      <div v-if="mode === 'angebot' || mode === 'laden'" class="actions">
        <button type="button" class="action" @click="mode === 'angebot' ? start() : run()">
          <IconSparkles aria-hidden="true" />
          {{ mode === "angebot" ? "Nach Bedeutung suchen" : "Modell laden und suchen" }}
        </button>
        <button type="button" class="textlink" @click="dismiss">
          {{ mode === "angebot" ? "Nee, danke" : "Nee, lieber nich" }}
        </button>
        <span class="private">
          <IconLock aria-hidden="true" />Läuft lokal in deinem Browser. Deine Suche verlässt dein
          Gerät nicht.
        </span>
      </div>

      <template v-else-if="mode === 'laeuft'">
        <progress class="progress" max="1" :value="progress ?? undefined" :aria-label="step" />
        <p ref="status" class="status" tabindex="-1">
          {{ step }}
          <button type="button" class="textlink" @click="cancel">Abbrechen</button>
        </p>
      </template>

      <div v-else-if="mode === 'fehler'" class="actions">
        <button type="button" class="action" @click="run">Nochmal versuchen</button>
        <button type="button" class="textlink" @click="mode = 'aus'">Schließen</button>
      </div>

      <template v-else-if="mode === 'fertig'">
        <div id="ki-treffer" class="list" role="listbox" aria-label="KI-Vorschläge">
          <HitRow
            v-for="e in hits"
            :id="`ki-${e.slug}`"
            :key="e.slug"
            :hit="{ entry: e, tier: 3 }"
            :q="state.q"
            :active="e.slug === activeSlug"
            :wotd="e.slug === wotd"
            :trend-rank="trendRanks.get(e.slug)"
            :scope="state"
          />
        </div>
        <div class="foot">
          <span class="private">
            <IconLock aria-hidden="true" />Von Chrome-KI lokal sortiert. Kann danebenliegen.
          </span>
          <span class="ask">Hat’s jepasst?</span>
          <button
            v-for="v in ['ja', 'nee'] as const"
            :key="v"
            type="button"
            class="feedback"
            :aria-pressed="fb === v ? 'true' : 'false'"
            @click="feedback(v)"
          >
            <IconUp v-if="v === 'ja'" aria-hidden="true" />
            <IconDown v-else aria-hidden="true" />
            {{ v === "ja" ? "Ja" : "Nee" }}
          </button>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { SearchState } from "@lib/search/state";
import type { SearchEntry } from "@lib/search/types";

import {
  type Availability,
  cacheKey,
  createBase,
  isDescription,
  type LanguageModelSession,
  rankCandidates,
} from "@lib/search/semantic";
import { trackEvent } from "@utils/analytics";
import { reportError } from "@utils/reportError.ts";
import { useEventListener } from "@vueuse/core";
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onUnmounted,
  ref,
  shallowRef,
  useTemplateRef,
  watch,
} from "vue";

import HitRow from "./HitRow.vue";

const props = defineProps<{
  availability: Exclude<Availability, "unavailable">;
  state: SearchState;
  /** The 40 filtered candidates for a state (`semanticCandidates`). */
  find: (s: SearchState) => Promise<SearchEntry[]>;
  trendRanks: Map<string, number>;
  wotd?: string;
  /** The option the field's ↑/↓ points at. */
  activeSlug?: string;
}>();
/** The focused button vanished and there is no status line: the field takes focus. */
const emit = defineEmits<{ refocus: [] }>();

const IconSparkles = defineAsyncComponent(() => import("virtual:icons/lucide/sparkles"));
const IconLock = defineAsyncComponent(() => import("virtual:icons/lucide/lock"));
const IconUp = defineAsyncComponent(() => import("virtual:icons/lucide/thumbs-up"));
const IconDown = defineAsyncComponent(() => import("virtual:icons/lucide/thumbs-down"));

const DISMISSED = "search-ai-dismissed";
const CACHE = "search-ai:";

const storage = {
  get: (key: string) => {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null; // blocked storage: no offer memory, no cache
    }
  },
  set: (key: string, value: string) => {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // full or blocked: the next visit computes again
    }
  },
};

type Mode = "aus" | "angebot" | "laden" | "laeuft" | "fertig" | "fehler" | "leer";
const mode = ref<Mode>("aus");
const hits = shallowRef<SearchEntry[]>([]);
const progress = ref<number | null>(null);
const ranking = ref(false);
const fb = ref<"ja" | "nee">();
let dismissed = storage.get(DISMISSED) === "1";

const step = computed(() =>
  progress.value !== null
    ? `Modell wird jeladen … ${Math.round(progress.value * 100)} %`
    : ranking.value
      ? "KI sortiert die besten 40 Kandidaten …"
      : "Wörterbuch wird vorbereitet …",
);

const copy = computed((): [string, string] => {
  const n = hits.value.length;
  switch (mode.value) {
    case "angebot":
      return [
        "Dit klingt nach ’ner Beschreibung",
        `Die Bedeutungssuche findet Wörter, die zu „${props.state.q}“ passen, ooch wenn keen Stichwort übereinstimmt.`,
      ];
    case "laden":
      return [
        "Einmal dit KI-Modell laden?",
        "Chrome braucht dafür einmalig sein eingebautes KI-Modell (mehrere GB, kommt von Google). Danach läuft die Bedeutungssuche ooch offline.",
      ];
    case "laeuft":
      return [
        "Ick such nach Bedeutung …",
        "Die Chrome-KI vergleicht deine Beschreibung mit den Bedeutungen im Wörterbuch.",
      ];
    case "fertig":
      return [
        // TODO(suche): SPEC §8.3 says „{n} Wörter“; singular „1 Wort“ is a deviation to confirm.
        `Passt vielleicht: ${n} ${n === 1 ? "Wort" : "Wörter"} nach Bedeutung`,
        "Sortiert nach Bedeutung, nicht nach Stichwort. Die Stichworttreffer stehen darunter.",
      ];
    case "fehler":
      return [
        "Hat nich jeklappt",
        "Die Chrome-KI hat jerade keene Antwort jegeben. Die Stichworttreffer unten sind trotzdem da.",
      ];
    default:
      return [
        "Nüscht Passendet jefunden",
        "Ooch nach Bedeutung passt keen Wort so richtig. Magste et anders beschreiben?",
      ];
  }
});

/* One base session per page visit, cloned per request (guide `language-model`). */
let basePromise: Promise<LanguageModelSession> | undefined;
const base = () =>
  (basePromise ??= createBase((p) => (progress.value = p < 1 ? p : null)).catch((error) => {
    basePromise = undefined; // the next click tries again
    throw error;
  }));
/** Pre-warm only without a download: a download needs the user's click. */
const warm = () => props.availability === "available" && void base().catch(() => {});

let runId = 0;
let runKey: string | undefined;
let controller: AbortController | undefined;
const stop = () => {
  runId++;
  controller?.abort();
  runKey = undefined;
};
const idle = (): Mode => (isDescription(props.state.q) && !dismissed ? "angebot" : "aus");

async function run() {
  const s = props.state;
  const id = ++runId;
  controller?.abort();
  const ctl = (controller = new AbortController());
  const key = (runKey = cacheKey(s));
  hits.value = [];
  fb.value = undefined;
  progress.value = null;
  ranking.value = false;
  mode.value = "laeuft";
  const cached = storage.get(CACHE + key);
  try {
    // base() runs inside the click: create() may start the model download.
    const [session, candidates] = await Promise.all([cached ? undefined : base(), props.find(s)]);
    if (id !== runId) return;
    let slugs: string[] = cached ? (JSON.parse(cached) as string[]) : [];
    if (!cached && candidates.length) {
      ranking.value = true;
      slugs = await rankCandidates(session!, s.q, candidates, ctl.signal);
      if (id !== runId) return;
      storage.set(CACHE + key, JSON.stringify(slugs)); // only real answers: no candidates may be a cold index
    }
    const bySlug = new Map(candidates.map((e) => [e.slug, e]));
    hits.value = slugs.flatMap((slug) => bySlug.get(slug) ?? []);
    mode.value = hits.value.length ? "fertig" : "leer";
  } catch (error) {
    if (id !== runId) return; // own abort: a newer run or a query change took over
    // An AbortError here came from Chrome (session torn down): no answer, but not a bug to report.
    if ((error as Error | undefined)?.name !== "AbortError") reportError(error);
    mode.value = "fehler";
  }
}

/** KI button, Shift+Enter, the offer and the empty state. Searches only after this click. */
function start() {
  if (!props.state.q.trim()) return;
  if (props.availability !== "available" && !basePromise) mode.value = "laden";
  else void run();
}

function cancel() {
  stop();
  mode.value = "aus";
}

function dismiss() {
  dismissed = true;
  storage.set(DISMISSED, "1");
  mode.value = "aus";
}

function feedback(v: "ja" | "nee") {
  if (fb.value === v) return;
  fb.value = v;
  trackEvent("Search", "AI feedback", v);
}

// A new query or filter drops the result and the running request (SPEC §8.3).
watch(
  () => cacheKey(props.state),
  (key) => {
    if (key === runKey) return;
    stop();
    hits.value = [];
    mode.value = idle();
  },
  { immediate: true },
);
watch(mode, (m) => m === "angebot" && warm(), { immediate: true });

// A vanished button (Abbrechen, Modell laden und suchen) hands focus on instead of dropping it to <body>.
const root = useTemplateRef("root");
const status = useTemplateRef("status");
watch(mode, async () => {
  if (!root.value?.contains(document.activeElement)) return;
  await nextTick();
  if (document.activeElement !== document.body) return;
  if (status.value) status.value.focus();
  else emit("refocus");
});

function destroy() {
  stop();
  if (mode.value === "laeuft") mode.value = "aus";
  const p = basePromise;
  basePromise = undefined;
  void p?.then(
    (s) => s.destroy(),
    () => {},
  );
}
useEventListener("pagehide", destroy);
useEventListener(document, "astro:before-swap", destroy);
onUnmounted(destroy);

const pressed = computed(() => mode.value === "laeuft" || mode.value === "fertig");
defineExpose({ hits, pressed, start, warm });
</script>

<style lang="scss">
@use "@styles/components/semantic-search";
</style>
