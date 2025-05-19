<template>
  <button
    type="button"
    class="c-sort-word-direction-toggle c-button c-button--center-icon c-button--filter c-button--dashed-border"
    :class="{ 'is-active': orderCategory === wordSearch.activeOrderCategory }"
    :aria-label="'sortiere ' + (orderType === 'ASC' ? 'aufsteigend' : 'absteigend')"
    @click="
      toggleFn();
      setActiveOrderCategory(orderCategory);
    "
  >
    <transition name="fade-fast" mode="out-in">
      <span
        v-if="orderType === 'ASC'"
        key="ASC"
        class="c-sort-word-direction-toggle__button c-button--center-icon"
      >
        <SortAsc />
        <span><slot name="asc-text">aufsteigend</slot></span>
      </span>
      <span v-else key="DESC" class="c-sort-word-direction-toggle__button c-button--center-icon">
        <SortDesc />
        <span><slot name="desc-text">absteigend</slot></span>
      </span>
    </transition>
  </button>
</template>

<script setup lang="ts">
import SortAsc from "virtual:icons/lucide/sort-asc";
import SortDesc from "virtual:icons/lucide/sort-desc";
import type { WordList } from "@stores/index.ts";
import { setActiveOrderCategory, $wordSearch } from "@stores/index.ts";
import { useStore } from "@nanostores/vue";

interface SortWordByProps {
  orderCategory: WordList["activeOrderCategory"];
  orderType: "ASC" | "DESC";
  toggleFn: () => void;
}

const { orderType, toggleFn } = defineProps<SortWordByProps>();

const wordSearch = useStore($wordSearch);
</script>

<style scoped></style>
