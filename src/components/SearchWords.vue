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
      id="wordSearch"
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
import { useStore } from "@nanostores/vue";
import {
  $oramaSearchResults,
  $searchQuery,
  searchLength as currentSearchLength,
} from "@stores/wordList.ts";
import { useSearchQuerySync } from "@composables/useSearchQuerySync";
import { setMatomoSearch } from "@utils/analytics";
import { useDebounceFn } from "@vueuse/core";
import Search from "virtual:icons/lucide/search";
import X from "virtual:icons/lucide/x";
import { computed, onMounted, ref, useTemplateRef, watch } from "vue";

interface SearchWordsProps {
  autoFocus?: boolean;
  buttonPosition?: "left" | "right";
}

const { autoFocus = false, buttonPosition = "left" } = defineProps<SearchWordsProps>();

useSearchQuerySync();

const searchLength = useStore(currentSearchLength);
const _searchQuery = useStore($searchQuery);
const localSearch = computed({
  get: () => _searchQuery.value,
  set: (v: string) => $searchQuery.set(v),
});

const searchInput = useTemplateRef("searchInput");

const oramaResults = useStore($oramaSearchResults);
const pendingTrackSearch = ref<string | null>(null);

watch(oramaResults, (results) => {
  if (results.state === "ready" && pendingTrackSearch.value !== null) {
    setMatomoSearch(pendingTrackSearch.value, "Word Search", results.value?.count ?? 0);
    pendingTrackSearch.value = null;
  }
});

const trackWordSearchListSearch = (search: string) => {
  if (oramaResults.value.state === "ready") {
    setMatomoSearch(search, "Word Search", oramaResults.value.value?.count ?? 0);
  } else {
    pendingTrackSearch.value = search;
  }
};

const debouncedTrackSearch = useDebounceFn(trackWordSearchListSearch, 1000, {
  maxWait: 5000,
});

const updateSearch = async (): Promise<void> => {
  await debouncedTrackSearch(localSearch.value);
};

const buttonActions = (): void => {
  if (searchLength.value > 0) resetSearch();
};

const resetSearch = (): void => {
  $searchQuery.set("");
};

const focusSearchInput = () => {
  if (searchInput.value) {
    searchInput.value.focus();
  }
};

onMounted(() => {
  if (autoFocus) focusSearchInput();
});

defineExpose({
  focusSearchInput,
});
</script>

<style lang="scss">
@use "@styles/components/word-search";
</style>
