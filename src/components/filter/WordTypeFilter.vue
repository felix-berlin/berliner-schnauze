<template>
  <nav class="c-word-type-filter">
    <ul class="c-word-type-filter__list u-list-reset">
      <li class="c-word-type-filter__list-item">
        <button
          class="c-word-type-filter__button is-all c-button c-button--filter"
          :class="{ 'is-current': !wordSearch.activeWordTypeFilter?.length }"
          type="button"
          @click="setWordTypeFilter('')"
        >
          Alle
        </button>
      </li>
      <li
        v-for="(wordType, idx) in wordSearch.wordTypes"
        :key="wordType!"
        class="c-word-type-filter__list-item"
      >
        <button
          :aria-label="`Filter nach Worttyp ${wordType}`"
          type="button"
          class="c-word-type-filter__button c-button c-button--filter c-button--center-icon"
          :class="{ 'is-current': wordSearch.activeWordTypeFilter.includes(wordType) }"
          :title="`Filter nach Worttyp ${wordType}`"
          @click="setWordTypeFilter(wordType!)"
          @mouseover="handleMouseOver(idx, wordType)"
          @focus="handleMouseOver(idx, wordType)"
          @mouseleave="handleMouseLeave"
          @blur="handleMouseLeave"
        >
          {{ wordType }}
          <Transition name="fade" mode="out-in">
            <X v-if="showRemoveIdx === idx" :width="18" :height="18" />
          </Transition>
        </button>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $wordSearch, setWordTypeFilter } from "@stores/index.ts";
import { defineAsyncComponent, ref } from "vue";

const X = defineAsyncComponent(() => import("virtual:icons/lucide/x"));

const wordSearch = useStore($wordSearch);

// Only show remove icon on hovered index if active
const showRemoveIdx = ref<null | number>(null);

const handleMouseOver = (idx: number, wordType: string) => {
  if (wordSearch.value.activeWordTypeFilter.includes(wordType)) {
    showRemoveIdx.value = idx;
  }
};

const handleMouseLeave = () => {
  showRemoveIdx.value = null;
};
</script>

<style lang="scss">
@use "@styles/components/word-type-filter";
</style>
