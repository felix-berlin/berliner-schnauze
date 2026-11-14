<template>
  <DropdownPopover
    v-if="variant === 'word'"
    :name="`word-options-${slug ?? ''}`"
    :offset="6"
    placement="bottom-end"
    theme="bare"
    class="c-options-dropdown"
  >
    <template #default="{ triggerProps }">
      <button
        v-bind="triggerProps"
        aria-haspopup="menu"
        aria-label="Weitere Aktionen"
        class="c-icon-button"
        type="button"
        @keydown.down.prevent="focusItem(0)"
      >
        <EllipsisVertical width="18" height="18" aria-hidden="true" />
      </button>
      <span aria-live="polite" class="u-sr-only" role="status">{{ announcement }}</span>
    </template>

    <template #panel>
      <div
        ref="menuEl"
        aria-label="Weitere Aktionen"
        class="c-word-menu"
        role="menu"
        @keydown="onMenuKeydown"
      >
        <button class="item" role="menuitem" type="button" @click="shareOrCopy">
          <Share2 width="18" height="18" aria-hidden="true" />
          <span>Wort teilen</span>
        </button>
        <button
          v-if="clipBoardIsSupported"
          :data-done="done === 'link'"
          class="item"
          role="menuitem"
          type="button"
          @click="copyLink"
        >
          <Check v-if="done === 'link'" width="18" height="18" aria-hidden="true" />
          <Link v-else width="18" height="18" aria-hidden="true" />
          <span>{{ done === "link" ? "Link kopiert" : "Link kopieren" }}</span>
        </button>
        <button
          v-if="clipBoardIsSupported"
          :data-done="done === 'word'"
          class="item"
          role="menuitem"
          type="button"
          @click="copyWord"
        >
          <Check v-if="done === 'word'" width="18" height="18" aria-hidden="true" />
          <Copy v-else width="18" height="18" aria-hidden="true" />
          <span>{{ done === "word" ? "Wort kopiert" : "Wort kopieren" }}</span>
        </button>
      </div>
    </template>
  </DropdownPopover>

  <DropdownPopover
    v-else
    :name="`word-options-${slug ?? ''}`"
    placement="bottom-end"
    theme="menu"
    class="c-options-dropdown"
  >
    <template #default="{ triggerProps }">
      <button v-bind="triggerProps" type="button" aria-label="Optionen" class="c-icon-button">
        <EllipsisVertical width="18" height="18" aria-hidden="true" />
      </button>
    </template>

    <template #panel>
      <slot name="before" />

      <button
        v-if="shareIsSupported"
        aria-label="Wort teilen"
        type="button"
        class="c-menu-item"
        @click="shareWord(slug ?? '')"
      >
        <Share2 width="18" height="18" aria-hidden="true" />

        <span>Wort teilen</span>
      </button>

      <button
        v-if="clipBoardIsSupported"
        aria-label="Link zum Wort kopieren"
        type="button"
        class="c-menu-item"
        @click="copyWordPageUrlToClipboard(slug ?? '')"
      >
        <Link width="18" height="18" aria-hidden="true" />

        <span>Link kopieren</span>
      </button>

      <button
        v-if="clipBoardIsSupported"
        aria-label="Wort kopieren"
        type="button"
        class="c-menu-item"
        @click="copyNameToClipboard(berlinerisch ?? '')"
      >
        <Copy width="18" height="18" aria-hidden="true" />

        <span>Wort kopieren</span>
      </button>

      <slot name="after" />
    </template>
  </DropdownPopover>
</template>

<script setup lang="ts">
import DropdownPopover from "@components/DropdownPopover.vue";
import { createToastNotify } from "@stores/toastNotify.ts";
import { trackEvent } from "@utils/analytics";
import { routeToWord } from "@utils/helpers.ts";
import { reportError } from "@utils/reportError.ts";
import { reportWord } from "@utils/wordPulse.ts";
import { useClipboard, useShare } from "@vueuse/core";
import { SITE_URL } from "astro:env/client";
import Check from "virtual:icons/lucide/check";
import Copy from "virtual:icons/lucide/copy";
import Link from "virtual:icons/lucide/link";
import Share2 from "virtual:icons/lucide/share-2";
import { defineAsyncComponent, onBeforeUnmount, ref } from "vue";

interface WordProps {
  berlinerisch: string;
  slug: string;
  /** "word": the v3 word page menu (no toasts, in-menu "kopiert" state). Default: the list menu. */
  variant?: "list" | "word";
  wordId?: number;
}

const { berlinerisch, slug, variant = "list", wordId } = defineProps<WordProps>();

const menuEl = ref<HTMLElement | null>(null);
const done = ref<"link" | "word" | null>(null);
const announcement = ref("");
let doneTimer: ReturnType<typeof setTimeout> | undefined;
onBeforeUnmount(() => clearTimeout(doneTimer));

/** Icon becomes a check and the label "…kopiert" for 2s; no toast, a live region speaks it. */
const announce = (message: string, ms: number): void => {
  announcement.value = message;
  clearTimeout(doneTimer);
  doneTimer = setTimeout(() => {
    done.value = null;
    announcement.value = "";
  }, ms);
};
const markDone = (what: "link" | "word"): void => {
  done.value = what;
  announce(what === "link" ? "Link kopiert" : "Wort kopiert", 2000);
};

const items = (): HTMLElement[] =>
  Array.from(menuEl.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

const focusItem = (index: number): void => {
  const list = items();
  list[(index + list.length) % list.length]?.focus();
};

// Esc and focus return to the trigger come from the popover itself (DropdownPopover.onToggle); Tab closes.
const onMenuKeydown = (event: KeyboardEvent): void => {
  const at = items().indexOf(document.activeElement as HTMLElement);
  if (event.key === "ArrowDown") focusItem(at + 1);
  else if (event.key === "ArrowUp") focusItem(at - 1);
  else if (event.key === "Home") focusItem(0);
  else if (event.key === "End") focusItem(-1);
  else if (event.key === "Tab") menuEl.value?.closest<HTMLElement>("[popover]")?.hidePopover();
  else return;
  if (event.key !== "Tab") event.preventDefault();
};

const EllipsisVertical = defineAsyncComponent(
  () => import("virtual:icons/lucide/ellipsis-vertical"),
);

const { copied, copy, isSupported: clipBoardIsSupported, text } = useClipboard();
const { isSupported: shareIsSupported, share } = useShare();

const COPY_FAILED = "Kopieren hat nich jeklappt";

/** Tells the user a copy failed: live region in the word menu, toast in the list menu. */
const failed = (): void => {
  if (variant === "word") announce(COPY_FAILED, 4000);
  else createToastNotify({ message: COPY_FAILED, status: "error" });
};

/** copy() swallows Clipboard API errors and without any clipboard support it does nothing: both count as failed, never as "kopiert". */
const copyText = async (value: string): Promise<boolean> => {
  try {
    if (!clipBoardIsSupported.value) throw new Error("Clipboard not supported");
    await copy(value);
    return true;
  } catch (error) {
    reportError(error);
    failed();
    return false;
  }
};

/**
 * Share the word
 *
 * @param   {string}  slug
 *
 * @return  {Promise<void>}
 */
const shareWord = async (slug: string): Promise<void> => {
  const shareData = {
    text: `Lerne mehr über das Berliner Wort: ${slug}`,
    title: `${slug} - Berliner Schnauze`,
    url: routeToWord(slug),
  };

  try {
    await share(shareData);
  } catch (error) {
    // The user dismissed the share sheet: not an error, nothing was shared.
    if (error instanceof DOMException && error.name === "AbortError") return;
    reportError(error);
    await copyWordPageUrlToClipboard(slug);
    return;
  }
  if (wordId !== undefined) reportWord(wordId, "share");
  if (variant === "list") createToastNotify({ message: "Wort geteilt", status: "success" });

  trackEvent("Word Share", "Word shared", `Word: ${slug}`);
};

/** Word page menu: share where the browser can, otherwise copy the link instead. */
const shareOrCopy = async (): Promise<void> => {
  if (shareIsSupported.value) await shareWord(slug ?? "");
  else await copyWordPageUrlToClipboard(slug ?? "");
};

const copyLink = () => copyWordPageUrlToClipboard(slug ?? "");
const copyWord = () => copyNameToClipboard(berlinerisch ?? "");

/**
 * Copy the word page url to the clipboard
 *
 * @param   {string}  slug
 *
 * @return  {Promise<void>}
 */
const copyWordPageUrlToClipboard = async (slug: string): Promise<void> => {
  if (!(await copyText(SITE_URL + routeToWord(slug)))) return;
  if (variant === "word") markDone("link");
  else createToastNotify({ message: "Link kopiert", status: "success" });

  trackEvent("Word Copy Link", "Word link copied", `Word: ${slug}`);
};

/**
 * Copy the word to the clipboard
 *
 * @param   {string}  name
 *
 * @return  {Promise<void>}
 */
const copyNameToClipboard = async (name: string): Promise<void> => {
  if (!(await copyText(name))) return;
  if (variant === "word") markDone("word");
  else createToastNotify({ message: "Wort kopiert", status: "success" });

  trackEvent("Word Copy", "Word copied", `Word: ${name}`);
};
</script>

<style lang="scss">
@use "@styles/components/options-dropdown";
@use "@styles/components/word-menu";
</style>
