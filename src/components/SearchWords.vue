<template>
  <div class="c-word-search c-word-search--large">
    <button
      :aria-label="searchLength > 0 ? 'Wortsuche löschen' : 'Wortsuche betätigen'"
      type="button"
      :class="[
        'c-word-search__search-button c-button c-button--center-icon',
        `c-word-search__search-button--${buttonPosition}`,
      ]"
      @click="buttonActions"
    >
      <Transition name="fade-fast" mode="out-in">
        <span v-if="searchLength === 0" key="search" class="c-button--center-icon">
          <Search default-class="c-word-search__search-icon" />
        </span>
        <span v-else key="del" class="c-button--center-icon">
          <X />
        </span>
      </Transition>
    </button>

    <input
      ref="searchInput"
      v-model="localSearch"
      type="search"
      class="c-word-search__search-input c-input"
      aria-label="Suche nach einem Berliner Word"
      placeholder="Durchsuche den Berliner-Jargon"
      autocomplete="off"
      @input="updateSearch()"
    />
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef, onMounted } from "vue";
import Search from "virtual:icons/lucide/search";
import X from "virtual:icons/lucide/x";
import {
  $wordSearch,
  setSearch,
  searchLength as currentSearchLength,
  $searchResultCount,
} from "@stores/index";
import { setMatomoSearch } from "@utils/analytics";
import { useStore, useVModel } from "@nanostores/vue";
import { useDebounceFn } from "@vueuse/core";

interface SearchWordsProps {
  buttonPosition?: "left" | "right";
  autoFocus?: boolean;
}

const { buttonPosition = "left", autoFocus = false } = defineProps<SearchWordsProps>();

const searchLength = useStore(currentSearchLength);
const searchResultCount = useStore($searchResultCount);
const localSearch = useVModel($wordSearch, "search");

const searchInput = useTemplateRef("searchInput");

const trackWordSearchListSearch = (search: string) => {
  setMatomoSearch(search, "Word Search", searchResultCount.value);
};

const debouncedTrackSearch = useDebounceFn(trackWordSearchListSearch, 1000, { maxWait: 5000 });

/**
 * Emits the search value to the parent component
 */
const updateSearch = async (): Promise<void> => {
  setSearch(localSearch.value);
  await debouncedTrackSearch(localSearch.value);
};

/**
 * Handles the button actions
 *
 * @return  {void}
 */
const buttonActions = (): void => {
  if (searchLength.value > 0) resetSearch();
};

/**
 * Resets the search value
 *
 * @return  {void}
 */
const resetSearch = (): void => {
  localSearch.value = "";
};

const focusSearchInput = () => {
  if (searchInput.value) {
    searchInput.value.focus();
  }
};

onMounted(() => {
  if (autoFocus) {
    focusSearchInput();
  }
});

defineExpose({
  focusSearchInput,
});
</script>

<style lang="scss">
@use "@styles/components/word-search";
</style>
