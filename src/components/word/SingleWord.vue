<template>
  <article
    :id="'word' + source.wordProperties.id"
    :ref="'word' + source.wordProperties.id"
    :key="source.id"
    :data-group="source.wordProperties.group"
    class="c-word-list__word"
    :class="{ 'has-translation': source.wordProperties.translations }"
    data-track-content
    data-content-name="word"
  >
    <div :class="[{ 'has-example': source.examples }, 'c-word-list__header-wrapper']">
      <dl class="c-word-list__header">
        <dt
          class="c-word-list__berlinerisch"
          :data-content-piece="source.wordProperties.berlinerisch"
        >
          <span
            v-if="isWordOfTheDay"
            v-tooltip="{
              content: `${source.wordProperties.berlinerisch} ist das heutige Wort des Tages`,
              distance: 10,
              placement: 'top',
            }"
            class="c-word-list__crown"
            aria-hidden="true"
          >
            <Crown />
          </span>
          <a :href="routeToWord(source.slug)">
            {{ source.wordProperties.berlinerisch }}
          </a>
        </dt>

        <dd
          v-for="(translation, translationIndex) in source.wordProperties.translations"
          :key="translationIndex"
          class="c-word-list__translation"
        >
          {{ translation.translation }}
        </dd>
      </dl>

      <VDropdown
        placement="bottom-end"
        class="c-word-list--word-option"
        distance="9"
        :delay="wordButtonClicked ? { hide: 10000 } : { hide: 0 }"
        :shown="wordButtonClicked"
        theme="word-options"
      >
        <button
          type="button"
          class="c-button c-button--center-icon c-button--word-option c-button--dashed-border"
          aria-label="Website Menu Navigation"
        >
          <span class="u-icon-untouchable c-button--center-icon icon-lucide-more-vertical"> </span>
        </button>

        <template #popper>
          <button
            v-if="usingShare.isSupported"
            aria-label="Wort teilen"
            type="button"
            class="c-word-list__copy-button c-button c-button--dashed-border"
            :class="{ 'is-success': wordShared === index }"
            @click="shareWord(source.slug, index)"
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
            @click="copyWordPageUrlToClipboard(source.slug, index)"
          >
            <span
              class="c-word-list__icon-button"
              :class="{ 'is-hidden': wordLinkCopied === index }"
            >
              <Link width="18" height="18" />
            </span>
            <span
              class="c-word-list__icon-button"
              :class="{ 'is-hidden': wordLinkCopied !== index }"
            >
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
            @click="copyNameToClipboard(source.wordProperties.berlinerisch, index)"
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
    </div>

    <WordExamples :examples="source.wordProperties.examples" />

    <a
      v-if="
        source.wordProperties.learn_more ||
        source.wordProperties.related_words ||
        source.wordProperties.word_type
      "
      :href="routeToWord(source.slug)"
      class="c-word-list__learn-more c-button u-button-reset"
    >
      <Info :size="20" /> mehr erfahren
    </a>
  </article>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Copy from "virtual:icons/lucide/copy";
import CheckCircle2 from "virtual:icons/lucide/check-circle-2";
import Info from "virtual:icons/lucide/info";
import Link from "virtual:icons/lucide/link";
import Share2 from "virtual:icons/lucide/share-2";
import Crown from "virtual:icons/lucide/crown";
import WordExamples from "@components/word/WordExamples.vue";
import { routeToWord } from "@utils/helpers";
import { useClipboard, useShare } from "@vueuse/core";

import type { BerlinerWord_Wordproperties } from "@ts_types/generated";

interface WordProps {
  source: BerlinerWord_Wordproperties;
  index: number;
}

const { source, index } = defineProps<WordProps>();

const wordCopied = ref<number | null>(null);
const wordLinkCopied = ref<number | null>(null);
const wordShared = ref<number | null>(null);
const wordButtonClicked = ref<boolean>(false);
const isWordOfTheDay = ref<boolean>(false);

// const { text, copy, copied, isSupported } = useClipboard({ source });
const usingClipboard = useClipboard({ source });
const usingShare = useShare();

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

const copyWordPageUrlToClipboard = (slug: string, index: number) => {
  usingClipboard.copy(import.meta.env.PUBLIC_SITE_URL + routeToWord(slug));
  wordLinkCopied.value = index;
  wordButtonClicked.value = true;

  setTimeout(() => {
    wordLinkCopied.value = null;
    wordButtonClicked.value = false;
  }, 1500);
};

const copyNameToClipboard = (name: string, index: number) => {
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
