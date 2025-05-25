<template>
  <WindowVirtualizer v-slot="{ item, index }" :data="mutableOramaSearch" class="c-word-list">
    <SingleWord :key="index" :source="item" :style="{ 'margin-bottom': '1.75rem' }" />
  </WindowVirtualizer>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SingleWord from "@components/word/SingleWord.vue";
import { useStore } from "@nanostores/vue";
import { $oramaSearchResults } from "@stores/index.ts";
import { WindowVirtualizer } from "virtua/vue";

const oramaSearch = useStore($oramaSearchResults);
const mutableOramaSearch = computed(
  () => oramaSearch.value?.hits?.map((hit) => hit.document) ?? [],
);
</script>

<style lang="scss">
@use "@styles/components/word-list";
</style>
