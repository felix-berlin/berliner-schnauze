<template>
  <DropdownPopover
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
import Copy from "virtual:icons/lucide/copy";
import Link from "virtual:icons/lucide/link";
import Share2 from "virtual:icons/lucide/share-2";
import { defineAsyncComponent } from "vue";

interface WordProps {
  berlinerisch: string;
  slug: string;
  wordId?: number;
}

const { berlinerisch, slug, wordId } = defineProps<WordProps>();

const EllipsisVertical = defineAsyncComponent(
  () => import("virtual:icons/lucide/ellipsis-vertical"),
);

const { copied, copy, isSupported: clipBoardIsSupported, text } = useClipboard();
const { isSupported: shareIsSupported, share } = useShare();

const COPY_FAILED = "Kopieren hat nich jeklappt";

/** copy() swallows Clipboard API errors and without any clipboard support it does nothing: both count as failed, never as "kopiert". */
const copyText = async (value: string): Promise<boolean> => {
  try {
    if (!clipBoardIsSupported.value) throw new Error("Clipboard not supported");
    await copy(value);
    return true;
  } catch (error) {
    reportError(error);
    createToastNotify({ message: COPY_FAILED, status: "error" });
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
  createToastNotify({ message: "Wort geteilt", status: "success" });

  trackEvent("Word Share", "Word shared", `Word: ${slug}`);
};

/**
 * Copy the word page url to the clipboard
 *
 * @param   {string}  slug
 *
 * @return  {Promise<void>}
 */
const copyWordPageUrlToClipboard = async (slug: string): Promise<void> => {
  if (!(await copyText(SITE_URL + routeToWord(slug)))) return;
  createToastNotify({ message: "Link kopiert", status: "success" });

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
  createToastNotify({ message: "Wort kopiert", status: "success" });

  trackEvent("Word Copy", "Word copied", `Word: ${name}`);
};
</script>

<style lang="scss">
@use "@styles/components/options-dropdown";
</style>
