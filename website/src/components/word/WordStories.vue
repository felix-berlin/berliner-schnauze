<template>
  <div class="c-word-stories">
    <ContributeForm type="story" :word="word" :prompt="prompt" />

    <div v-if="!formOpen" class="prompt">
      <BerlinerBaer :size="72" mood="point" />
      <div class="question">
        <p class="c-word-label">Frage der Woche</p>
        <p class="text">{{ prompt }}</p>
      </div>
      <button
        class="c-button ask"
        data-variant="outline"
        type="button"
        data-contribute="story"
        :aria-expanded="formOpen"
        @click="openContributeForm('story')"
      >
        <MessageCircle aria-hidden="true" class="icon" height="18" width="18" />
        Erzähl’s
      </button>
    </div>

    <p v-if="total === 0 && !formOpen" class="empty">
      Noch keene Jeschichte zu „{{ label }}“. Erzähl du die erste!
    </p>

    <ul v-if="pending.length" class="c-word-own">
      <li v-for="p in pending" :key="p.id" class="item">
        <span class="chip">Wird jeprüft</span>
        <span class="text">{{ preview(p.text) }}</span>
      </li>
    </ul>

    <ol
      v-if="items.length"
      :id="`${uid}-list`"
      ref="list"
      class="list"
      :data-collapsed="!expanded || undefined"
    >
      <li
        v-for="(s, i) in shown"
        :key="s.id"
        class="item"
        :data-narrow-hidden="(!expanded && i >= 2) || undefined"
        :tabindex="i === limit ? -1 : undefined"
      >
        <blockquote class="quote">„{{ s.text }}“</blockquote>
        <div class="meta">
          <span class="by">{{ meta(s) }}</span>
          <span class="reactions" role="group" aria-label="Reaktionen">
            <button
              v-for="r in REACTIONS"
              :key="r.value"
              class="c-reaction"
              data-variant="pill compact"
              type="button"
              :aria-disabled="!online || busy.has(s.id)"
              :aria-label="`${r.label}, ${count(s, r.value)}`"
              :aria-pressed="mine[s.id] === r.value"
              @click="react(s, r.value)"
            >
              {{ r.label }} <b class="count">{{ count(s, r.value) }}</b>
            </button>
          </span>
        </div>
      </li>
    </ol>

    <p v-if="!online && items.length" class="note">{{ OFFLINE_HINT }}</p>
    <p class="note u-sr-only-empty" role="status">{{ note }}</p>

    <button
      v-if="(!expanded && items.length > limit) || hasMore"
      class="all"
      type="button"
      :aria-busy="loading"
      :aria-controls="`${uid}-list`"
      :aria-expanded="false"
      @click="expand"
    >
      {{ loading ? "Lade …" : `Alle ${total} Jeschichten lesen` }}
    </button>

    <p class="foot">Jede Jeschichte wird vor der Veröffentlichung jeprüft.</p>
  </div>
</template>

<script setup lang="ts">
import BerlinerBaer from "@components/kalle/BerlinerBaer.vue";
import ContributeForm from "@components/word/ContributeForm.vue";
import { OFFLINE_HINT, useOnline } from "@composables/useOnline.ts";
import { BEZIRK_NAMES } from "@lib/bezirkNames.ts";
import { agoLabel, type Story } from "@lib/story.ts";
import { useStore } from "@nanostores/vue";
import { openContributeForm, openForm } from "@stores/contribute.ts";
import { useMediaQuery } from "@vueuse/core";
import MessageCircle from "virtual:icons/lucide/message-circle";
import { computed, nextTick, onMounted, reactive, ref, useId, useTemplateRef } from "vue";

const props = defineProps<{
  /** The word as written ("Schrippe"), for the gap text. */
  label: string;
  initial: { featured: null | Story; items: Story[]; total: number };
  /** "Frage der Woche". */
  prompt: string;
  /** Slug of the word. */
  word: string;
}>();

const FAILED = "Ditt hat nich jeklappt.";
const PREVIEW = 80;
const MAX_PAGES = 25;
const REACTIONS = [
  { label: "Jenau!", value: 1 },
  { label: "Kenn ick anders", value: -1 },
] as const;

const uid = useId();
const online = useOnline();
const $open = useStore(openForm);
const formOpen = computed(() => $open.value === "story");
const list = useTemplateRef<HTMLElement>("list");

const items = ref<Story[]>(props.initial.items.map((s) => ({ ...s })));
const total = props.initial.total;
const featuredId = props.initial.featured?.id;
// Page 1 came with the page; the featured story is counted in `total` but never in the list.
const hasMore = ref(total - (props.initial.featured ? 1 : 0) > items.value.length);
let page = 1;

const mine = reactive<Record<string, -1 | 0 | 1>>({});
const pending = ref<{ id: number; text: string }[]>([]);
const busy = reactive(new Set<string>());
const note = ref("");

// The query only counts once mounted: setup() already sees the client value, which would differ from the server markup (three). The "word" breakpoint (808px) of the page shell,
// which also hides the third story before hydration (objects/_word-v18.scss): SPEC §3, mobile 2, from tablet 3.
const NARROW = "(width < 50.5rem)";
const narrow = useMediaQuery(NARROW);
const mounted = ref(false);
const mobile = computed(() => mounted.value && narrow.value);
const limit = computed(() => (mobile.value ? 2 : 3));
const expanded = ref(false);
const loading = ref(false);
const shown = computed(() => (expanded.value ? items.value : items.value.slice(0, limit.value)));

// Stories the visitor reacted to since the page loaded: a late `/mine` answer must not overwrite them.
const touched = new Set<string>();

onMounted(async () => {
  mounted.value = true;
  try {
    const res = await fetch(`/api/stories/mine?word=${encodeURIComponent(props.word)}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as {
      pending?: { id: number; text: string }[];
      reactions?: Record<string, -1 | 1>;
    };
    for (const [id, vote] of Object.entries(data.reactions ?? {})) {
      if (!touched.has(id)) mine[id] = vote;
    }
    pending.value = data.pending ?? [];
  } catch {
    // Own state is a convenience: without it nothing is pressed and no chip shows.
  }
});

const preview = (text: string): string =>
  text.length > PREVIEW ? `${text.slice(0, PREVIEW)}…` : text;

const meta = (s: Story): string =>
  [
    s.name || "aus der Community",
    s.bezirk && BEZIRK_NAMES[s.bezirk] ? `aus ${BEZIRK_NAMES[s.bezirk]}` : "",
    agoLabel(s.createdAt),
  ]
    .filter(Boolean)
    .join(" · ");

const count = (s: Story, value: -1 | 1): number => (value === 1 ? s.jenau : s.anders);

// Never below 0: the page is cached for a minute, so a count can be older than the visitor's own reaction.
const shift = (s: Story, vote: number, by: 1 | -1): void => {
  if (vote === 1) s.jenau = Math.max(0, s.jenau + by);
  if (vote === -1) s.anders = Math.max(0, s.anders + by);
};

const react = async (s: Story, value: -1 | 1): Promise<void> => {
  // aria-disabled, not disabled: the button keeps the focus while the call runs or the page is offline.
  if (!online.value || busy.has(s.id)) return;
  const before = { anders: s.anders, jenau: s.jenau, mine: mine[s.id] ?? 0 };
  const next = before.mine === value ? 0 : value;
  touched.add(s.id);
  shift(s, before.mine, -1);
  shift(s, next, 1);
  mine[s.id] = next;
  busy.add(s.id);
  note.value = "";
  try {
    const res = await fetch("/api/comment-votes", {
      body: JSON.stringify({ commentId: Number(s.id), value: next }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { downvotes: number; myVote: -1 | 0 | 1; upvotes: number };
    s.jenau = data.upvotes;
    s.anders = data.downvotes;
    mine[s.id] = data.myVote;
  } catch {
    s.jenau = before.jenau;
    s.anders = before.anders;
    mine[s.id] = before.mine;
    note.value = FAILED;
  } finally {
    busy.delete(s.id);
  }
};

const loadPage = async (): Promise<boolean> => {
  try {
    const res = await fetch(
      `/api/stories?word=${encodeURIComponent(props.word)}&page=${page + 1}`,
      {
        cache: "no-store",
      },
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { hasMore: boolean; items: Story[] };
    const known = new Set(items.value.map((s) => s.id));
    // The featured story sits in the head; a story that arrived between two pages must not show twice.
    items.value.push(...data.items.filter((s) => s.id !== featuredId && !known.has(s.id)));
    page += 1;
    hasMore.value = data.hasMore;
    return true;
  } catch {
    return false;
  }
};

// "Alle lesen" reveals what is loaded at once, then loads the remaining pages one after another (`hasMore` decides).
// A failed page keeps the button (it retries) and leaves the pages already loaded in place.
const expand = async (): Promise<void> => {
  if (loading.value) return;
  loading.value = true;
  note.value = "";
  expanded.value = true;
  const firstNew = items.value.length > limit.value;
  if (firstNew) void focusFirstNew();
  while (hasMore.value && page < MAX_PAGES) {
    // oxlint-disable-next-line no-await-in-loop -- pages depend on each other (`hasMore`), so they load one after another
    if (!(await loadPage())) {
      note.value = FAILED;
      break;
    }
  }
  loading.value = false;
  if (!firstNew) void focusFirstNew();
};

const focusFirstNew = async (): Promise<void> => {
  await nextTick();
  list.value?.querySelector<HTMLElement>("li[tabindex]")?.focus();
};
</script>

<style lang="scss">
@use "@styles/components/word-own";
@use "@styles/components/word-stories";
</style>
