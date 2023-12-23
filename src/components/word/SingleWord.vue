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
    <div
      :class="[{ 'has-example': source.wordProperties?.examples }, 'c-word-list__header-wrapper']"
    >
      <dl class="c-word-list__header">
        <dt
          class="c-word-list__berlinerisch"
          :data-content-piece="source.wordProperties?.berlinerisch"
        >
          <span
            v-if="isWordOfTheDay"
            v-tooltip="{
              content: `${source.wordProperties?.berlinerisch} ist das heutige Wort des Tages`,
              distance: 10,
              placement: 'top',
            }"
            class="c-word-list__crown"
            aria-hidden="true"
          >
            <Crown />
          </span>
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
      <WordOptionDropdown :index="index" :word="source" />
    </div>

    <WordExamples :examples="source.wordProperties?.examples!" />

    <a
      v-if="
        source.wordProperties?.learnMore ||
        source.wordProperties?.relatedWords?.nodes ||
        source.berlinerischWordTypes
      "
      :href="routeToWord(source.slug!)"
      class="c-word-list__learn-more c-button u-button-reset"
    >
      <Info :width="20" :height="20" /> mehr erfahren
    </a>
  </article>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Info from "virtual:icons/lucide/info";
import Crown from "virtual:icons/lucide/crown";
import WordExamples from "@components/word/WordExamples.vue";
import WordOptionDropdown from "@components/word/WordOptionDropdown.vue";
import { routeToWord } from "@utils/helpers";
import type { CleanBerlinerWord } from "@stores/index";

interface WordProps {
  source: CleanBerlinerWord;
  index: number;
}

const { source, index } = defineProps<WordProps>();

const isWordOfTheDay = ref<boolean>(false);
</script>

<style scoped></style>
