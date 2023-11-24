<template>
  <Component :is="element" v-if="examples" :class="`${rootBemClass}__example-wrapper`">
    <Quote width="44" height="44" :stroke-width="0" :class="`${rootBemClass}__quote-icon`" />

    <div v-if="examples && examples.length === 1" :class="`${rootBemClass}__single-example`">
      <p
        v-if="examples && examples.length === 1"
        :class="`${rootBemClass}__example`"
        v-text="examples[0]?.example"
      />

      <p
        v-if="examples && examples.length === 1 && examples[0]?.exampleExplanation"
        :class="`${rootBemClass}__example-explanation`"
        v-text="'– ' + examples[0].exampleExplanation"
      />
    </div>

    <!-- If more than one example exist -->
    <ol v-if="examples && examples.length > 1" :class="`${rootBemClass}__examples`">
      <li
        v-for="(item, exampleIndex) in examples"
        :key="exampleIndex"
        :class="`${rootBemClass}__examples-list-item`"
      >
        <span :class="rootBemClass + '__examples-item'">{{ item?.example }}</span>
        <div v-if="item?.exampleExplanation" :class="`${rootBemClass}__examples-explanation`">
          – {{ item.exampleExplanation }}
        </div>
      </li>
    </ol>
  </Component>
</template>

<script setup lang="ts">
import Quote from "virtual:icons/lucide/quote";
import type { Maybe, BerlinerWord_Wordproperties_Examples } from "@ts_types/generated/graphql";

interface WordExamplesProps {
  examples: Maybe<BerlinerWord_Wordproperties_Examples>[];
  element?: string;
  rootBemClass?: string;
}

const {
  examples,
  element = "div",
  rootBemClass = "c-word-list",
} = defineProps<WordExamplesProps>();
</script>

<style scoped></style>
