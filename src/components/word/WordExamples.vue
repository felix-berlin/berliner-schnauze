<template>
  <div v-if="examples" :class="`${props.rootBemClass}__example-wrapper`">
    <Quote
      :width="44"
      :height="44"
      :stroke-width="0"
      :class="`${props.rootBemClass}__quote-icon`"
      aria-hidden="true"
    />

    <div v-if="examples && examples.length === 1" :class="`${props.rootBemClass}__single-example`">
      <p
        v-if="examples && examples.length === 1"
        :class="`${props.rootBemClass}__example`"
        v-text="examples[0]?.example"
      />

      <p
        v-if="examples && examples.length === 1 && examples[0]?.exampleExplanation"
        :class="`${props.rootBemClass}__example-explanation`"
        v-text="'– ' + examples[0].exampleExplanation"
      />

      <AudioPlayerList
        v-if="examples[0]?.exampleAudio"
        :audio="examples[0]?.exampleAudio"
        is-type="example"
      />
    </div>

    <!-- If more than one example exist -->
    <ol v-if="examples && examples.length > 1" :class="`${props.rootBemClass}__examples`">
      <li
        v-for="(item, exampleIndex) in examples"
        :key="exampleIndex"
        :class="`${props.rootBemClass}__examples-list-item`"
      >
        <span :class="props.rootBemClass + '__examples-item'">{{ item?.example }}</span>
        <div v-if="item?.exampleExplanation" :class="`${props.rootBemClass}__examples-explanation`">
          – {{ item.exampleExplanation }}
        </div>
        <AudioPlayerList
          v-if="examples[exampleIndex]?.exampleAudio"
          :audio="examples[exampleIndex]?.exampleAudio"
          is-type="example"
        />
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import Quote from "virtual:icons/lucide/quote";
import type { Maybe, WordPropertiesExamples } from "@/gql/graphql";

const AudioPlayerList = defineAsyncComponent(() => import("@components/AudioPlayerList.vue"));

interface WordExamplesProps {
  examples?: Maybe<WordPropertiesExamples>[];
  rootBemClass?: string;
}

const props = withDefaults(defineProps<WordExamplesProps>(), {
  examples: () => [],
  rootBemClass: "c-word-list",
});
</script>

<style scoped></style>
