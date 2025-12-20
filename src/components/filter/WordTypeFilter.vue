<template>
  <nav class="c-word-type-filter">
    <Multiselect
      v-model="value"
      mode="multiple"
      :close-on-select="false"
      :hide-selected="false"
      :options="wordSearch.wordTypes"
      locale="de"
      fallback-locale="en"
      class="c-word-type-filter__select"
      placeholder="Worttypen filtern"
    />
  </nav>
</template>

<script setup lang="ts">
import { useStore, useVModel } from "@nanostores/vue";
import { $wordSearch } from "@stores/index.ts";
import Multiselect from '@vueform/multiselect';

const wordSearch = useStore($wordSearch);
const value = useVModel($wordSearch, 'activeWordTypeFilter');
</script>

<style lang="scss">
@use "@styles/components/word-type-filter";
@use "@vueform/multiselect/themes/default.css";
</style>
