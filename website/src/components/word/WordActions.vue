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
          class="c-reaction"
          data-variant="pill"
          type="button"
          @click="react(r.value)"
        >
          <component :is="r.icon" aria-hidden="true" height="18" width="18" />
          <b class="count">{{ count(r.value) }}</b>
        </button>
      </div>

      <button class="c-reaction" data-variant="pill" type="button" @click="share">
        <component
          :is="copied === 'share' ? Check : Share2"
          aria-hidden="true"
          height="18"
          width="18"
        />
        {{ copied === "share" ? "Link kopiert" : "Teilen" }}
      </button>

      <DropdownPopover
        ref="popover"
        :name="`word-actions-${slug}`"
        placement="top-end"
        theme="bare"
        @toggle="onPopoverToggle"
      >
        <template #default="{ triggerProps }">
          <button
            v-bind="triggerProps"
            ref="trigger"
            aria-haspopup="menu"
            aria-label="Mehr"
            class="c-reaction"
            data-variant="pill"
            type="button"
            @click="onTriggerClick"
            @keydown="onTriggerKey"
          >
            <EllipsisVertical aria-hidden="true" height="18" width="18" />
          </button>
        </template>
        <template #panel>
          <div
            ref="menu"
            aria-label="Mehr"
            class="c-word-actions-menu"
            role="menu"
            @keydown="(e) => onMenuKeydown(e, menu, closeMenu)"
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
                  <span v-else ref="linkText" class="pick">{{ displayUrl }}</span>
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
                  <template v-else
                    >„<span ref="wordText" class="pick">{{ wordCopy }}</span>“ als Text</template
                  >
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
        </template>
      </DropdownPopover>
    </div>

    <p v-if="!online && wordId !== undefined" class="note">{{ OFFLINE_HINT }}</p>
    <p aria-atomic="true" aria-live="polite" class="live" role="status">{{ live }}</p>

    <section v-if="citeOpen" :aria-labelledby="`${uid}-head`" class="cite" role="region">
      <div class="head">
        <h3 :id="`${uid}-head`" class="heading">Zitieren</h3>
        <button
          aria-label="Zitieren schließen"
          class="c-icon-button"
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
        class="tabpanel"
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
import DropdownPopover from "@components/DropdownPopover.vue";
import { menuItems, onMenuKeydown } from "@composables/useMenuKeys.ts";
import { OFFLINE_HINT, useOnline } from "@composables/useOnline.ts";
import { useWordReaction } from "@composables/useWordReaction.ts";
import { formatCitation, type CitationFormat } from "@lib/wordCite.ts";
import { openContributeForm } from "@stores/contribute.ts";
import { trackEvent } from "@utils/analytics";
import { reportError } from "@utils/reportError.ts";
import { reportWord } from "@utils/wordPulse.ts";
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
import { computed, nextTick, onBeforeUnmount, ref, useId, useTemplateRef } from "vue";

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
const FAILED = "Ditt hat nich jeklappt.";
const COPIED_MS = 2000;

const uid = useId();
const online = useOnline();
const root = useTemplateRef<HTMLElement>("root");
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

/** Marks the element's text; false when there is nothing to mark. */
const select = (el: HTMLElement | null): boolean => {
  if (!el?.isConnected) return false;
  const range = document.createRange();
  range.selectNodeContents(el);
  const selection = globalThis.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  return true;
};

/** Writes to the clipboard; when that is denied or missing, the text is marked for Strg+C instead. */
const copy = async (
  text: string,
  what: "cite" | "link" | "share" | "word",
  message: string,
  source: () => HTMLElement | null | Promise<HTMLElement | null>,
  onCopied?: () => void,
): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
    flash(what, message);
    onCopied?.();
  } catch {
    // A fresh "kopiert" title hides the text span: bring it back before marking it.
    copied.value = null;
    await nextTick();
    // Only claim "Markiert" when a selection really exists.
    announce(select(await source()) ? MARKED : FAILED);
  }
};

// Same Matomo events as the old menu (WordOptionDropdown).
const trackLinkCopied = (): void =>
  trackEvent("Word Copy Link", "Word link copied", `Word: ${props.slug}`);

const copyLink = () =>
  copy(props.url, "link", "Link kopiert", () => linkText.value, trackLinkCopied);
const copyWord = () =>
  copy(
    wordCopy.value,
    "word",
    "Wort kopiert",
    () => wordText.value,
    () => trackEvent("Word Copy", "Word copied", `Word: ${props.word}`),
  );

// --- share -----------------------------------------------------------------------------------------
const share = async (): Promise<void> => {
  if (typeof navigator.share === "function") {
    let shared = false;
    try {
      await navigator.share({ title: props.word, url: props.url });
      shared = true;
    } catch (error) {
      // The visitor closed the sheet: nothing to do. Any other failure falls back to copying.
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
    if (shared) {
      // Outside the try: a failing tracker must not turn a finished share into the copy fallback.
      try {
        // Feeds the trending lists; a draft (no id) has none.
        if (props.wordId !== undefined) reportWord(props.wordId, "share");
        trackEvent("Word Share", "Word shared", `Word: ${props.slug}`);
      } catch (error) {
        reportError(error);
      }
      return;
    }
  }
  // Denied: the menu shows the link text; it is selected there so "Markiert" is true.
  await copy(
    props.url,
    "share",
    "Link kopiert",
    async () => {
      popover.value?.open();
      await nextTick();
      return linkText.value;
    },
    trackLinkCopied,
  );
};

// --- menu (APG menu button) --------------------------------------------------------------------------
// DropdownPopover owns open state, light dismiss, Esc and the focus return; this part adds the menu keys.
const popover = useTemplateRef<InstanceType<typeof DropdownPopover>>("popover");
const citeOpen = ref(false);
let enterAt: "first" | "last" | null = null;

const closeMenu = (): void => popover.value?.close();

// The toggle event arrives after the open: only then do the items exist to take the focus.
const onPopoverToggle = async (open: boolean): Promise<void> => {
  const at = enterAt;
  enterAt = null;
  if (!open || !at) return;
  await nextTick();
  const list = menuItems(menu.value);
  (at === "first" ? list[0] : list.at(-1))?.focus();
};

// Enter and Space click with detail 0 and enter the menu; a pointer click leaves the focus on the button.
// The popover opens itself (popovertarget) after this handler.
const onTriggerClick = (event: MouseEvent): void => {
  if (event.detail === 0) enterAt = "first";
};

const onTriggerKey = (event: KeyboardEvent): void => {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  event.preventDefault();
  enterAt = event.key === "ArrowDown" ? "first" : "last";
  popover.value?.open();
};

// Esc closes the citing panel (the menu closes itself natively). The listener exists only while the panel is open
// (a stray Esc does nothing) and ignores Esc aimed at other parts of the page.
useEventListener(
  computed(() => (citeOpen.value ? globalThis.document : undefined)),
  "keydown",
  (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    const target = event.target as Node | null;
    if (target !== document.body && !root.value?.contains(target)) return;
    closeCite(true);
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
  closeMenu();
  const reduce = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  document
    .getElementById("fehler")
    ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  // The form focuses its first choice when it opens.
  openContributeForm("error");
};

// --- reactions ---------------------------------------------------------------------------------------
const { count, current, pending, react } = useWordReaction(() => props.wordId);

onBeforeUnmount(() => clearTimeout(timer));
</script>

<style lang="scss">
@use "@styles/components/word-actions";
@use "@styles/components/word-actions-menu";
</style>
