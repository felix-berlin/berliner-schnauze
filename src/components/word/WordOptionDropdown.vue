<template>
  <VDropdown
    placement="bottom-end"
    class="c-word-list__options-dropdown"
    distance="9"
    :delay="wordButtonClicked ? { hide: 10000 } : { hide: 0 }"
    :shown="wordButtonClicked"
    theme="word-options"
  >
    <button
      type="button"
      class="c-word-list__options c-button c-button--center-icon c-button--dashed-border"
      aria-label="Website Menu Navigation"
    >
      <span
        class="c-word-list__options-icon c-button--center-icon c-icon c-icon--lucide-more-vertical"
      >
      </span>
    </button>

    <template #popper>
      <button
        v-if="usingShare.isSupported"
        aria-label="Wort teilen"
        type="button"
        class="c-word-list__copy-button c-button c-button--dashed-border"
        :class="{ 'is-success': wordShared === index }"
        @click="shareWord(word.slug!, index)"
      >
        <span class="c-word-list__icon-button" :class="{ 'is-hidden': wordShared === index }">
          <Share2 width="18" height="18" />
        </span>
        <span class="c-word-list__icon-button" :class="{ 'is-hidden': wordShared !== index }">
          <CheckCircle2 width="18" height="18" />
        </span>
        <span class="c-word-list__copy-text">Wort teilen</span>
      </button>

      <button
        v-if="usingShare.isSupported"
        aria-label="Link zum Wort kopieren"
        type="button"
        class="c-word-list__copy-button c-button c-button--dashed-border"
        :class="{ 'is-success': wordLinkCopied === index }"
        @click="copyWordPageUrlToClipboard(word.slug!, index)"
      >
        <span class="c-word-list__icon-button" :class="{ 'is-hidden': wordLinkCopied === index }">
          <Link width="18" height="18" />
        </span>
        <span class="c-word-list__icon-button" :class="{ 'is-hidden': wordLinkCopied !== index }">
          <CheckCircle2 width="18" height="18" />
        </span>
        <span class="c-word-list__copy-text">Link kopieren</span>
      </button>

      <button
        v-if="usingClipboard.isSupported"
        aria-label="Wort kopieren"
        type="button"
        class="c-word-list__copy-button c-button c-button--dashed-border"
        :class="{ 'is-success': wordCopied === index }"
        @click="copyNameToClipboard(word.wordProperties?.berlinerisch!, index)"
      >
        <span class="c-word-list__icon-button" :class="{ 'is-hidden': wordCopied === index }">
          <Copy width="18" height="18" />
        </span>
        <span class="c-word-list__icon-button" :class="{ 'is-hidden': wordCopied !== index }">
          <CheckCircle2 width="18" height="18" />
        </span>
        <span class="c-word-list__copy-text">Wort kopieren</span>
      </button>
    </template>
  </VDropdown>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Copy from "virtual:icons/lucide/copy";
import CheckCircle2 from "virtual:icons/lucide/check-circle-2";
import Link from "virtual:icons/lucide/link";
import Share2 from "virtual:icons/lucide/share-2";
import { routeToWord } from "@utils/helpers";
import { useClipboard, useShare } from "@vueuse/core";
import type { CleanBerlinerWord } from "@stores/index";

interface WordProps {
  word: CleanBerlinerWord;
  index: number;
}

const { word, index } = defineProps<WordProps>();

const wordCopied = ref<number | null>(null);
const wordLinkCopied = ref<number | null>(null);
const wordButtonClicked = ref<boolean>(false);
const wordShared = ref<number | null>(null);

const usingClipboard = useClipboard({ word });
const usingShare = useShare();

/**
 * Share the word
 *
 * @param   {string}  slug
 * @param   {number}  index
 *
 * @return  {void}
 */
const shareWord = (slug: string, index: number) => {
  const shareData = {
    title: `${slug} - Berliner Schnauze`,
    text: `Lerne mehr über das Berliner Wort: ${slug}`,
    url: routeToWord(slug),
  };

  usingShare.share(shareData);

  wordShared.value = index;
  wordButtonClicked.value = true;

  setTimeout(() => {
    wordShared.value = null;
    wordButtonClicked.value = false;
  }, 1500);
};

/**
 * Copy the word page url to the clipboard
 *
 * @param   {string}  slug
 * @param   {number}  index
 *
 * @return  {void}
 */
const copyWordPageUrlToClipboard = (slug: string, index: number): void => {
  usingClipboard.copy(import.meta.env.PUBLIC_SITE_URL + routeToWord(slug));
  wordLinkCopied.value = index;
  wordButtonClicked.value = true;

  setTimeout(() => {
    wordLinkCopied.value = null;
    wordButtonClicked.value = false;
  }, 1500);
};

/**
 * Copy the word to the clipboard
 *
 * @param   {string}  name
 * @param   {number}  index
 *
 * @return  {void}
 */
const copyNameToClipboard = (name: string, index: number): void => {
  usingClipboard.copy(name);

  wordCopied.value = index;
  wordButtonClicked.value = true;

  setTimeout(() => {
    wordCopied.value = null;
    wordButtonClicked.value = false;
  }, 1500);
};
</script>

<style scoped></style>
