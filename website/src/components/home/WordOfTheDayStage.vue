<template>
  <div class="c-home-stage">
    <span v-if="word.ipa" class="field" aria-hidden="true"
      ><span class="ipa">[{{ word.ipa }}]</span></span
    >
    <p class="eye"><b>Wort des Tages</b> {{ word.dateLabel }}</p>
    <div class="lemma-row">
      <h2
        id="wort-des-tages"
        class="lemma"
        :aria-label="word.lemma"
        :style="{ '--chars': [...word.lemma].length }"
      >
        <span
          v-for="(letter, i) in [...word.lemma]"
          :key="i"
          class="letter"
          aria-hidden="true"
          :style="{ '--i': i }"
          >{{ letter }}</span
        >
      </h2>
      <span v-if="word.article || word.wordType" class="art"
        >, {{ word.article || word.wordType }}</span
      >
      <WordSeal :word="word.lemma" :morse="word.morse" :audio-url="word.audioUrl" />
    </div>
    <p class="meaning">{{ word.meaning }}</p>
    <p v-if="word.example" class="example">
      „{{ word.example.text }}“<span v-if="word.example.translation">{{
        word.example.translation
      }}</span>
    </p>
    <!-- TODO(startseite): no recording route yet; stays a focusable non-link with a tooltip until it exists. -->
    <button
      v-if="!word.audioUrl"
      v-tooltip="{
        content: 'Kommt bald! Det Einsprechen is noch in Arbeit, Moment ma.',
        placement: 'top',
      }"
      type="button"
      class="no-audio"
      aria-disabled="true"
    >
      <IconMic aria-hidden="true" />
      <span><b>Noch keene Hörprobe.</b> Sprichste „{{ word.lemma }}“ ein?</span>
    </button>
    <a class="go" :href="`/wort/${word.slug}`">Zum Wort <IconArrowRight aria-hidden="true" /></a>
  </div>
</template>

<script setup lang="ts">
import type { HomeWord } from "@services/payload/home.ts";

import WordSeal from "@components/WordSeal.vue";
import { defineAsyncComponent } from "vue";

const IconMic = defineAsyncComponent(() => import("virtual:icons/lucide/mic"));
const IconArrowRight = defineAsyncComponent(() => import("virtual:icons/lucide/arrow-right"));

defineProps<{ word: HomeWord }>();
</script>

<style lang="scss">
@use "@styles/components/home-stage";
</style>
