<template>
  <VDropdown placement="bottom-end" class="c-options-dropdown" distance="9" theme="word-options">
    <button
      type="button"
      class="c-options-dropdown__options c-button c-button--center-icon"
      aria-label="Website Menu Navigation"
    >
      <span
        class="c-options-dropdown__options-icon c-button--center-icon c-icon c-icon--lucide-more-vertical"
      >
      </span>
    </button>

    <template #popper>
      <button
        v-if="usingShare.isSupported"
        aria-label="Wort teilen"
        type="button"
        class="c-options-dropdown__copy-button c-button"
        @click="shareWord(word.slug!)"
      >
        <Share2 width="18" height="18" class="c-options-dropdown__icon-button" />

        <span class="c-options-dropdown__copy-text">Wort teilen</span>
      </button>

      <button
        v-if="usingClipboard.isSupported"
        aria-label="Link zum Wort kopieren"
        type="button"
        class="c-options-dropdown__copy-button c-button"
        @click="copyWordPageUrlToClipboard(word.slug!)"
      >
        <Link width="18" height="18" class="c-options-dropdown__icon-button" />

        <span class="c-options-dropdown__copy-text">Link kopieren</span>
      </button>

      <button
        v-if="usingClipboard.isSupported"
        aria-label="Wort kopieren"
        type="button"
        class="c-options-dropdown__copy-button c-button"
        @click="copyNameToClipboard(word.wordProperties?.berlinerisch!)"
      >
        <Copy width="18" height="18" class="c-options-dropdown__icon-button" />

        <span class="c-options-dropdown__copy-text">Wort kopieren</span>
      </button>
    </template>
  </VDropdown>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Copy from "virtual:icons/lucide/copy";
import Link from "virtual:icons/lucide/link";
import Share2 from "virtual:icons/lucide/share-2";
import { routeToWord } from "@utils/helpers";
import { useClipboard, useShare } from "@vueuse/core";
import type { CleanBerlinerWord } from "@stores/index";
import { createToastNotify } from "@stores/index";

interface WordProps {
  word: CleanBerlinerWord;
}

const { word } = defineProps<WordProps>();

const usingClipboard = useClipboard();
const usingShare = useShare();

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

  usingShare.share(shareData);
  createToastNotify({ message: "Wort geteilt", status: "success" });
};

/**
 * Copy the word page url to the clipboard
 *
 * @param   {string}  slug
 *
 * @return  {void}
 */
const copyWordPageUrlToClipboard = (slug: string): void => {
  usingClipboard.copy(import.meta.env.PUBLIC_SITE_URL + routeToWord(slug));
  createToastNotify({
    message: "Link kopiert",
    status: "success",
  });
};

/**
 * Copy the word to the clipboard
 *
 * @param   {string}  name
 *
 * @return  {void}
 */
const copyNameToClipboard = (name: string): void => {
  usingClipboard.copy(name);
  createToastNotify({ message: "Wort kopiert", status: "success" });
};
</script>

<style lang="scss">
@use "@styles/components/icons";
@use "@styles/components/options-dropdown";
</style>
