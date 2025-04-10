<template>
  <VDropdown placement="bottom-end" class="c-options-dropdown" distance="9" theme="word-options">
    <button
      type="button"
      class="c-options-dropdown__options c-button c-button--center-icon"
      aria-label="Website Menu Navigation"
    >
      <span
        class="c-options-dropdown__options-icon c-button--center-icon c-icon c-icon--lucide-more-vertical"
      />
    </button>

    <template #popper>
      <slot name="before" />

      <button
        v-if="shareIsSupported"
        aria-label="Wort teilen"
        type="button"
        class="c-options-dropdown__copy-button c-button"
        @click="shareWord(slug)"
      >
        <Share2 width="18" height="18" class="c-options-dropdown__icon-button" />

        <span class="c-options-dropdown__copy-text">Wort teilen</span>
      </button>

      <button
        v-if="clipBoardIsSupported"
        aria-label="Link zum Wort kopieren"
        type="button"
        class="c-options-dropdown__copy-button c-button"
        @click="copyWordPageUrlToClipboard(slug)"
      >
        <Link width="18" height="18" class="c-options-dropdown__icon-button" />

        <span class="c-options-dropdown__copy-text">Link kopieren</span>
      </button>

      <button
        v-if="clipBoardIsSupported"
        aria-label="Wort kopieren"
        type="button"
        class="c-options-dropdown__copy-button c-button"
        @click="copyNameToClipboard(berlinerisch)"
      >
        <Copy width="18" height="18" class="c-options-dropdown__icon-button" />

        <span class="c-options-dropdown__copy-text">Wort kopieren</span>
      </button>

      <slot name="after" />
    </template>
  </VDropdown>
</template>

<script setup lang="ts">
import Copy from "virtual:icons/lucide/copy";
import Link from "virtual:icons/lucide/link";
import Share2 from "virtual:icons/lucide/share-2";
import { routeToWord } from "@utils/helpers.ts";
import { useClipboard, useShare } from "@vueuse/core";
import type { BerlinerWord } from "@stores/index.ts";
import { createToastNotify } from "@stores/index.ts";
import { SITE_URL } from "astro:env/client";
import { trackEvent } from "@utils/analytics";

interface WordProps {
  berlinerisch: BerlinerWord["wordProperties"]["berlinerisch"];
  slug: BerlinerWord["slug"];
}

const { berlinerisch, slug } = defineProps<WordProps>();

const { text, copy, copied, isSupported: clipBoardIsSupported } = useClipboard();
const { share, isSupported: shareIsSupported } = useShare();

/**
 * Share the word
 *
 * @param   {string}  slug
 *
 * @return  {void}
 */
const shareWord = (slug: string): void => {
  const shareData = {
    title: `${slug} - Berliner Schnauze`,
    text: `Lerne mehr über das Berliner Wort: ${slug}`,
    url: routeToWord(slug),
  };

  share(shareData).catch((err) => err);
  createToastNotify({ message: "Wort geteilt", status: "success" });

  trackEvent("Word Share", "Word shared", `Word: ${slug}`);
};

/**
 * Copy the word page url to the clipboard
 *
 * @param   {string}  slug
 *
 * @return  {void}
 */
const copyWordPageUrlToClipboard = async (slug: string): Promise<void> => {
  await copy(SITE_URL + routeToWord(slug));
  createToastNotify({
    message: "Link kopiert",
    status: "success",
  });

  trackEvent("Word Copy Link", "Word link copied", `Word: ${slug}`);
};

/**
 * Copy the word to the clipboard
 *
 * @param   {string}  name
 *
 * @return  {void}
 */
const copyNameToClipboard = async (name: string): Promise<void> => {
  await copy(name);
  createToastNotify({ message: "Wort kopiert", status: "success" });

  trackEvent("Word Copy", "Word copied", `Word: ${name}`);
};
</script>

<style lang="scss">
@use "@styles/components/icons";
@use "@styles/components/options-dropdown";
</style>
