<template>
  <Component :is="element" v-if="examples" :class="rootBemClass + '__example-wrapper'">
    <Quote :size="44" :stroke-width="0" :class="rootBemClass + '__quote-icon'" />

    <div v-if="examples && examples.length === 1" :class="rootBemClass + '__single-example'">
      <p
        v-if="examples && examples.length === 1"
        :class="rootBemClass + '__example'"
        v-text="examples[0].example"
      />

      <p
        v-if="examples && examples.length === 1 && examples[0].example_explanation"
        :class="rootBemClass + '__example-explanation'"
        v-text="'– ' + examples[0].example_explanation"
      />
    </div>
    <audio controls :src="examples[0].exampleAudio.mediaItemUrl">
      <track kind="caption" srclang="de" />
    </audio>
    <!-- If more than one example exist -->
    <ol v-if="examples && examples.length > 1" :class="rootBemClass + '__examples'">
      <li
        v-for="(item, exampleIndex) in examples"
        :key="exampleIndex"
        :class="rootBemClass + '__examples-list-item'"
      >
        <span :class="rootBemClass + '__examples-item'">{{ item.example }}</span>
        <div v-if="item.example_explanation" :class="rootBemClass + '__examples-explanation'">
          – {{ item.example_explanation }}
        </div>
      </li>
    </ol>
  </Component>
</template>

<script setup lang="ts">
import Quote from "virtual:icons/lucide/quote";
import type { BerlinerWord_Wordproperties } from "@ts_types/generated";

interface WordExamplesProps {
  examples?: BerlinerWord_Wordproperties["examples"][];
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
