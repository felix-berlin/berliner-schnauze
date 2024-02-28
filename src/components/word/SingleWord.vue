<template>
  <article
    :id="`word-${source.id}`"
    :ref="`word-${source.id}`"
    :key="source.id"
    :data-group="source.wordGroup"
    class="c-word-list__word"
    :class="{ 'has-translation': source.wordProperties?.translations }"
    data-track-content
    data-content-name="word"
  >
    <div :class="'c-word-list__header-wrapper'">
      <dl class="c-word-list__header">
        <dt
          class="c-word-list__berlinerisch"
          :data-content-piece="source.wordProperties?.berlinerisch"
        >
          <IsWordOfTheDay
            :word="source.wordProperties?.berlinerisch"
            :word-id="source.berlinerWordId"
            class="c-word-list__crown"
          />
          <a :href="routeToWord(source.slug!)">
            {{ source.wordProperties?.berlinerisch }}
          </a>
        </dt>

        <dd
          v-for="(translation, translationIndex) in source.wordProperties?.translations"
          :key="translationIndex"
          class="c-word-list__translation"
        >
          {{ translation?.translation }}
        </dd>
      </dl>
      <WordOptionDropdown
        :berlinerisch="source.wordProperties?.berlinerisch"
        :slug="source.slug"
        class="c-word-list__options-dropdown"
      >
        <template #after>
          <a :href="routeToWord(source.slug!)" class="c-options-dropdown__copy-button c-button">
            <BookOpen width="18" height="18" class="c-options-dropdown__icon-button" />
            <span class="c-options-dropdown__copy-text">Mehr erfahren</span>
          </a>
        </template>
      </WordOptionDropdown>
    </div>

    <!-- <WordExamples :examples="source.wordProperties?.examples!" /> -->
  </article>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
// import WordExamples from "@components/word/WordExamples.vue";
import BookOpen from "virtual:icons/lucide/book-open";
import WordOptionDropdown from "@components/word/WordOptionDropdown.vue";
import { routeToWord } from "@utils/helpers.ts";
import type { CleanBerlinerWord } from "@stores/index.ts";

type WordProps = {
  source: CleanBerlinerWord;
  index?: number;
};

const { source, index } = defineProps<WordProps>();

const IsWordOfTheDay = defineAsyncComponent(() => import("@components/word/IsWordOfTheDay.vue"));
</script>

<style scoped></style>
