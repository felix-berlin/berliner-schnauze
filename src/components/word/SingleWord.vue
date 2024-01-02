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
      <WordOptionDropdown :word="source" class="c-word-list__options-dropdown" />
    </div>

    <!-- <WordExamples :examples="source.wordProperties?.examples!" /> -->
  </article>
</template>

<script setup lang="ts">
import WordExamples from "@components/word/WordExamples.vue";
import WordOptionDropdown from "@components/word/WordOptionDropdown.vue";
import IsWordOfTheDay from "@components/word/IsWordOfTheDay.vue";
import { routeToWord } from "@utils/helpers";
import type { CleanBerlinerWord } from "@stores/index";

type WordProps = {
  source: CleanBerlinerWord;
  index: number;
};

const { source, index } = defineProps<WordProps>();
</script>

<style scoped></style>
