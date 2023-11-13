<template>
  <article
    :id="'word' + source.ID"
    :ref="'word' + source.ID"
    :key="source.ID"
    :data-group="source.group"
    class="c-word-list__word"
    :class="{ 'has-translation': source.translations }"
    data-track-content
    data-content-name="word"
  >
    <div :class="[{ 'has-example': source.examples }, 'c-word-list__header-wrapper']">
      <dl class="c-word-list__header">
        <dt class="c-word-list__berlinerisch" :data-content-piece="source.berlinerisch">
          <span
            v-if="isWordOfTheDay"
            v-tooltip="{
              content: `${source.berlinerisch} ist das heutige Wort des Tages`,
              distance: 10,
              placement: 'top',
            }"
            class="c-word-list__crown"
            aria-hidden="true"
          >
            <Crown />
          </span>
          <a :href="routeToWord(source.post_name)">
            {{ source.berlinerisch }}
          </a>
        </dt>

        <WordTranslations
          v-for="(translation, translationIndex) in source.translations"
          :key="translationIndex"
          :translation="translation"
          elements="dd"
          :child-element="false"
          class="c-word-list__translation"
        />
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
          <span class="u-icon-untouchable c-button--center-icon">
            <MoreVertical :size="18" />
          </span>
        </button>

        <template #popper>
          <button
            v-if="canShare"
            aria-label="Wort teilen"
            type="button"
            class="c-word-list__copy-button c-button c-button--dashed-border"
            :class="{ 'is-success': wordShared === index }"
            @click="shareWord(source.post_name, index)"
          >
            <span class="c-word-list__icon-button" :class="{ 'is-hidden': wordShared === index }">
              <Share2 :size="18" />
            </span>
            <span class="c-word-list__icon-button" :class="{ 'is-hidden': wordShared !== index }">
              <CheckCircle2 :size="18" />
            </span>
            <span class="c-word-list__copy-text">Wort teilen</span>
          </button>

          <button
            v-if="!canShare"
            aria-label="Link zum Wort kopieren"
            type="button"
            class="c-word-list__copy-button c-button c-button--dashed-border"
            :class="{ 'is-success': wordLinkCopied === index }"
            @click="copyWordPageUrlToClipboard(source.post_name, index)"
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
              <CheckCircle2 :size="18" />
            </span>
            <span class="c-word-list__copy-text">Link kopieren</span>
          </button>

          <button
            v-if="isSupported"
            aria-label="Wort kopieren"
            type="button"
            class="c-word-list__copy-button c-button c-button--dashed-border"
            :class="{ 'is-success': wordCopied === index }"
            @click="copy(source.berlinerisch)"
          >
            <span class="c-word-list__icon-button" :class="{ 'is-hidden': wordCopied === index }">
              <Copy :size="18" />
            </span>
            <span class="c-word-list__icon-button" :class="{ 'is-hidden': wordCopied !== index }">
              <CheckCircle2 :size="18" />
            </span>
            <span class="c-word-list__copy-text">Wort kopieren</span>
          </button>
        </template>
      </VDropdown>
    </div>

    <WordExamples :examples="source.examples" />

    <a
      v-if="source.learn_more || source.related_words || source.word_type"
      :href="routeToWord(source.post_name)"
      class="c-word-list__learn-more c-button u-button-reset"
    >
      <Info :size="20" /> mehr erfahren
    </a>
  </article>
</template>

<script setup lang="ts">
import { defineProps, ref } from "vue";
import Copy from "virtual:icons/lucide/copy";
import CheckCircle2 from "virtual:icons/lucide/check-circle-2";
import MoreVertical from "virtual:icons/lucide/more-vertical";
import Info from "virtual:icons/lucide/info";
import Link from "virtual:icons/lucide/link ";
import Share2 from "virtual:icons/lucide/share-2";
import Crown from "virtual:icons/lucide/crown ";
import WordExamples from "@components/word/WordExamples.vue";
import { routeToWord } from "@utils/helpers";
import { useClipboard } from "@vueuse/core";

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

const { text, copy, copied, isSupported } = useClipboard({ source });
</script>

<style scoped></style>
