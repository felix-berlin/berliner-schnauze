<template>
  <div ref="root" class="c-word-actions">
    <div class="row">
      <div
        v-if="wordId !== undefined"
        aria-label="Wie findste ditt Wort?"
        class="reactions"
        role="group"
      >
        <button
          v-for="r in REACTIONS"
          :key="r.value"
          :aria-disabled="!online || pending"
          :aria-label="`${r.label}, ${count(r.value)}`"
          :aria-pressed="current === r.value"
          class="pill"
          type="button"
          @click="react(r.value)"
        >
          <component :is="r.icon" aria-hidden="true" height="18" width="18" />
          <b class="num">{{ count(r.value) }}</b>
        </button>
      </div>

      <button class="pill" type="button" @click="share">
        <component
          :is="copied === 'share' ? Check : Share2"
          aria-hidden="true"
          height="18"
          width="18"
        />
        {{ copied === "share" ? "Link kopiert" : "Teilen" }}
      </button>

      <div ref="more" class="more">
        <button
          ref="trigger"
          :aria-expanded="menuOpen"
          aria-haspopup="menu"
          aria-label="Mehr"
          class="pill icon"
          type="button"
          @click="toggleMenu"
          @keydown="onTriggerKey"
        >
          <EllipsisVertical aria-hidden="true" height="18" width="18" />
        </button>

        <div
          v-if="menuOpen"
          ref="menu"
          aria-label="Mehr"
          class="menu"
          role="menu"
          :style="{ insetInlineEnd: shift ? `${-shift}px` : undefined }"
          @keydown="onMenuKey"
        >
          <button class="item" role="menuitem" tabindex="-1" type="button" @click="copyLink">
            <component
              :is="copied === 'link' ? Check : LinkIcon"
              aria-hidden="true"
              class="ico"
              height="18"
              width="18"
            />
            <span class="text">
              <b class="title">{{ copied === "link" ? "Link kopiert" : "Link kopieren" }}</b>
              <span class="sub">
                <template v-if="copied === 'link'">Jetzt einfügen, wo de willst</template>
                <span v-else ref="linkText">{{ displayUrl }}</span>
              </span>
            </span>
          </button>
          <button class="item" role="menuitem" tabindex="-1" type="button" @click="copyWord">
            <component
              :is="copied === 'word' ? Check : Copy"
              aria-hidden="true"
              class="ico"
              height="18"
              width="18"
            />
            <span class="text">
              <b class="title">{{ copied === "word" ? "Wort kopiert" : "Wort kopieren" }}</b>
              <span class="sub">
                <template v-if="copied === 'word'">Jetzt einfügen, wo de willst</template>
                <template v-else>„<span ref="wordText">{{ wordCopy }}</span>“ als Text</template>
              </span>
            </span>
          </button>
          <button class="item" role="menuitem" tabindex="-1" type="button" @click="openCite">
            <Quote aria-hidden="true" class="ico" height="18" width="18" />
            <span class="text">
              <b class="title">Zitieren</b>
              <span class="sub">Quellenangabe für Schule, Uni oder Artikel</span>
            </span>
          </button>
          <hr class="rule" />
          <button class="item" role="menuitem" tabindex="-1" type="button" @click="report">
            <Flag aria-hidden="true" class="ico" height="18" width="18" />
            <span class="text">
              <b class="title">Fehler melden</b>
              <span class="sub">Zu diesem Wort, wird jeprüft</span>
            </span>
          </button>
        </div>
      </div>
    </div>

    <p v-if="!online && wordId !== undefined" class="note">{{ OFFLINE_HINT }}</p>
    <p aria-atomic="true" aria-live="polite" class="live" role="status">{{ live }}</p>

    <section v-if="citeOpen" :aria-labelledby="`${uid}-head`" class="cite" role="region">
      <div class="head">
        <h3 :id="`${uid}-head`" class="heading">Zitieren</h3>
        <button
          aria-label="Zitieren schließen"
          class="close"
          type="button"
          @click="closeCite(true)"
        >
          <X aria-hidden="true" height="20" width="20" />
        </button>
      </div>
      <div ref="tablist" aria-label="Zitierformat" class="tabs" role="tablist" @keydown="onTabKey">
        <button
          v-for="f in FORMATS"
          :id="`${uid}-${f.value}`"
          :key="f.value"
          :aria-controls="`${uid}-panel`"
          :aria-selected="format === f.value"
          :tabindex="format === f.value ? 0 : -1"
          role="tab"
          type="button"
          @click="format = f.value"
        >
          {{ f.label }}
        </button>
      </div>
      <div
        :id="`${uid}-panel`"
        :aria-labelledby="`${uid}-${format}`"
        class="panel"
        role="tabpanel"
        tabindex="0"
      >
        <p class="hint">{{ HINTS[format] }}</p>
        <code ref="citeText" class="quote">{{ citation }}</code>
      </div>
      <div class="send">
        <button class="c-button" data-variant="primary" type="button" @click="copyCite">
          {{ copied === "cite" ? "Kopiert" : "Kopieren" }}
        </button>
      </div>
      <p class="foot">Abrufdatum is heute, dit Datum davor is die letzte Änderung am Eintrag.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { OFFLINE_HINT, useOnline } from "@composables/useOnline.ts";
import { formatCitation, type CitationFormat } from "@lib/wordCite.ts";
import { useStore } from "@nanostores/vue";
import { openContributeForm } from "@stores/contribute.ts";
import { $feedback, loadFeedback } from "@stores/wordFeedback.ts";
import { toggleReaction, type Reaction } from "@utils/wordReaction.ts";
import { useEventListener } from "@vueuse/core";
import Check from "virtual:icons/lucide/check";
import Copy from "virtual:icons/lucide/copy";
import EllipsisVertical from "virtual:icons/lucide/ellipsis-vertical";
import Flag from "virtual:icons/lucide/flag";
import LinkIcon from "virtual:icons/lucide/link";
import Quote from "virtual:icons/lucide/quote";
import Share2 from "virtual:icons/lucide/share-2";
import ThumbsDown from "virtual:icons/lucide/thumbs-down";
import ThumbsUp from "virtual:icons/lucide/thumbs-up";
import X from "virtual:icons/lucide/x";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  useTemplateRef,
  watch,
} from "vue";

const props = defineProps<{
  /** Meaning shown after the word in "Wort kopieren"; empty = the word alone. */
  meaning?: string | undefined;
  slug: string;
  /** ISO date of the last change of the entry (page model). */
  updatedAt: string;
  /** Canonical word URL, the one the page head carries (not the preview route). */
  url: string;
  word: string;
  /** Without it (draft preview) there are no reactions. */
  wordId?: number | undefined;
}>();

const REACTIONS = [
  { icon: ThumbsUp, label: "Daumen hoch", value: "like" },
  { icon: ThumbsDown, label: "Daumen runter", value: "dislike" },
] as const;
const FORMATS = [
  { label: "Kurz", value: "short" },
  { label: "APA", value: "apa" },
  { label: "Wikipedia", value: "wikipedia" },
] as const satisfies readonly { label: string; value: CitationFormat }[];
const HINTS: Record<CitationFormat, string> = {
  apa: "Für Schule und Uni (APA 7)",
  short: "Für Fließtext, Mails und Präsentationen",
  wikipedia: "Vorlage „Internetquelle“ für Einzelnachweise",
};
const MARKED = "Markiert. Mit Strg+C kopieren.";
const COPIED_MS = 2000;

const uid = useId();
const online = useOnline();
const root = useTemplateRef<HTMLElement>("root");
const more = useTemplateRef<HTMLElement>("more");
const trigger = useTemplateRef<HTMLButtonElement>("trigger");
const menu = useTemplateRef<HTMLElement>("menu");
const tablist = useTemplateRef<HTMLElement>("tablist");
const linkText = useTemplateRef<HTMLElement>("linkText");
const wordText = useTemplateRef<HTMLElement>("wordText");
const citeText = useTemplateRef<HTMLElement>("citeText");

const displayUrl = computed(() => props.url.replace(/^https?:\/\//, ""));
const wordCopy = computed(() => (props.meaning ? `${props.word} – ${props.meaning}` : props.word));

// --- announcements and the 2 s "copied" state ------------------------------------------------------
const live = ref("");
let lastMessage = "";
let timer: ReturnType<typeof setTimeout> | undefined;
const copied = ref<"cite" | "link" | "share" | "word" | null>(null);

// A screen reader skips a message equal to the previous one: a no-break space makes the repeat differ.
const announce = (message: string): void => {
  live.value = message === lastMessage ? `${message} ` : message;
  lastMessage = message;
};

const flash = (what: "cite" | "link" | "share" | "word", message: string): void => {
  copied.value = what;
  announce(message);
  clearTimeout(timer);
  timer = setTimeout(() => {
    copied.value = null;
    live.value = "";
  }, COPIED_MS);
};

const select = (el: HTMLElement | null): void => {
  if (!el) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  const selection = globalThis.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
};

/** Writes to the clipboard; when that is denied or missing, the text is marked for Strg+C instead. */
const copy = async (
  text: string,
  what: "cite" | "link" | "share" | "word",
  message: string,
  source: () => HTMLElement | null | Promise<HTMLElement | null>,
): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
    flash(what, message);
  } catch {
    select(await source());
    announce(MARKED);
  }
};

const copyLink = () => copy(props.url, "link", "Link kopiert", () => linkText.value);
const copyWord = () => copy(wordCopy.value, "word", "Wort kopiert", () => wordText.value);

// --- share -----------------------------------------------------------------------------------------
const share = async (): Promise<void> => {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: props.word, url: props.url });
      return;
    } catch (error) {
      // The visitor closed the sheet: nothing to do. Any other failure falls back to copying.
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }
  // Denied: the menu shows the link text; it is selected there so "Markiert" is true.
  await copy(props.url, "share", "Link kopiert", async () => {
    menuOpen.value = true;
    await nextTick();
    return linkText.value;
  });
};

// --- menu (APG menu button) --------------------------------------------------------------------------
const menuOpen = ref(false);
const citeOpen = ref(false);

const entries = (): HTMLElement[] => [
  ...(menu.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []),
];

const focusEntry = async (at: "first" | "last"): Promise<void> => {
  await nextTick();
  const list = entries();
  (at === "first" ? list[0] : list.at(-1))?.focus();
};

const closeMenu = (restoreFocus = false): void => {
  menuOpen.value = false;
  if (restoreFocus) trigger.value?.focus();
};

// Enter and Space click with detail 0 and enter the menu; a pointer click leaves the focus on the button.
const toggleMenu = async (event: MouseEvent): Promise<void> => {
  if (menuOpen.value) return closeMenu();
  menuOpen.value = true;
  if (event.detail === 0) await focusEntry("first");
};

const onTriggerKey = (event: KeyboardEvent): void => {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  event.preventDefault();
  menuOpen.value = true;
  void focusEntry(event.key === "ArrowDown" ? "first" : "last");
};

const onMenuKey = (event: KeyboardEvent): void => {
  // Tab closes the menu; focus continues from the menu button (the browser then moves to the next control).
  if (event.key === "Tab") return closeMenu(true);
  const list = entries();
  const at = list.indexOf(document.activeElement as HTMLElement);
  const target = {
    ArrowDown: (at + 1) % list.length,
    ArrowUp: (at - 1 + list.length) % list.length,
    End: list.length - 1,
    Home: 0,
  }[event.key];
  if (target === undefined) return;
  event.preventDefault();
  list[target]?.focus();
};

// The menu is right aligned to its button; on a narrow screen that can push it past the left edge of the head,
// which clips it. Measured after it opened, shifted right just enough (SPEC §5.1 keeps the right alignment otherwise).
const EDGE = 16;
const shift = ref(0);
watch(
  menuOpen,
  (open) => {
    shift.value = 0;
    const box = menu.value;
    if (!open || !box) return;
    const head = more.value?.closest("header")?.getBoundingClientRect().left ?? 0;
    shift.value = Math.max(0, Math.max(EDGE, head + EDGE) - box.getBoundingClientRect().left);
  },
  { flush: "post" },
);

// Click outside closes (the listener is removed with the component by VueUse).
useEventListener(globalThis.document, "click", (event: MouseEvent) => {
  if (menuOpen.value && !more.value?.contains(event.target as Node)) closeMenu();
});

// Esc acts on what is open inside this island: the menu first, then the panel. The listener exists only while
// something is open (a stray Esc does nothing) and ignores Esc aimed at other parts of the page.
const anyOpen = computed(() => menuOpen.value || citeOpen.value);
useEventListener(
  computed(() => (anyOpen.value ? globalThis.document : undefined)),
  "keydown",
  (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    const target = event.target as Node | null;
    if (target !== document.body && !root.value?.contains(target)) return;
    if (menuOpen.value) closeMenu(true);
    else closeCite(true);
  },
);

// --- citing ------------------------------------------------------------------------------------------
const format = ref<CitationFormat>("apa");
// Set when the panel opens, so no date is part of the server HTML.
const today = ref(new Date());

const citation = computed(() =>
  formatCitation(format.value, {
    today: today.value,
    updatedAt: new Date(props.updatedAt),
    url: props.url,
    word: props.word,
  }),
);

const openCite = async (): Promise<void> => {
  closeMenu();
  today.value = new Date();
  citeOpen.value = true;
  await nextTick();
  tablist.value?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
};

const closeCite = (restoreFocus = false): void => {
  citeOpen.value = false;
  if (restoreFocus) trigger.value?.focus();
};

const copyCite = () => copy(citation.value, "cite", "Kopiert", () => citeText.value);

// ARIA tabs: roving tabindex, selection follows focus.
const onTabKey = (event: KeyboardEvent): void => {
  const tabs = [...(tablist.value?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [])];
  const at = tabs.findIndex((t) => t === document.activeElement);
  const target = {
    ArrowLeft: (at - 1 + tabs.length) % tabs.length,
    ArrowRight: (at + 1) % tabs.length,
    End: tabs.length - 1,
    Home: 0,
  }[event.key];
  if (target === undefined || at < 0) return;
  event.preventDefault();
  format.value = FORMATS[target]!.value;
  tabs[target]?.focus();
};

// --- report -----------------------------------------------------------------------------------------
const report = (): void => {
  closeMenu(true);
  const reduce = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  document
    .getElementById("fehler")
    ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  // The form focuses its first choice when it opens.
  openContributeForm("error");
};

// --- reactions ---------------------------------------------------------------------------------------
const feedback = useStore($feedback);
const stored = computed<Reaction | null>(() => feedback.value?.mine?.reaction ?? null);
// What the visitor just chose, until the server answered; a failed request drops it (rollback).
const optimistic = ref<{ reaction: Reaction | null } | null>(null);
const current = computed(() => (optimistic.value ? optimistic.value.reaction : stored.value));
const pending = ref(false);

onMounted(() => {
  if (props.wordId !== undefined) void loadFeedback(props.wordId);
});

const count = (reaction: Reaction): number | string => {
  const total = feedback.value?.totals[reaction];
  if (total === undefined) return "–";
  return Math.max(
    0,
    total + Number(current.value === reaction) - Number(stored.value === reaction),
  );
};

const react = async (reaction: Reaction): Promise<void> => {
  // aria-disabled, not disabled: the button keeps the focus while the call runs or the page is offline.
  if (props.wordId === undefined || !online.value || pending.value) return;
  pending.value = true;
  try {
    if (!feedback.value) await loadFeedback(props.wordId);
    optimistic.value = { reaction: stored.value === reaction ? null : reaction };
    await toggleReaction(props.wordId, reaction);
  } finally {
    // Success: the store holds the answer. Failure: it still holds the old one.
    optimistic.value = null;
    pending.value = false;
  }
};

onBeforeUnmount(() => clearTimeout(timer));
</script>

<style lang="scss">
@use "@styles/components/word-actions";
</style>
