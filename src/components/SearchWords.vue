<template>
  <div class="c-word-search c-word-search--large">
    <button
      :aria-label="searchLength > 0 ? 'Wortsuche löschen' : 'Wortsuche betätigen'"
      type="button"
      :class="[
        'c-word-search__search-button u-button-reset c-button c-button--center-icon c-word-search__search-button--left',
        'c-button--' + buttonPosition,
      ]"
      @click="buttonActions"
    >
      <Transition name="fade-fast" mode="out-in">
        <span v-if="toggleShowAndClearIcon" key="search" class="c-button--center-icon">
          <Search default-class="c-word-search__search-icon" />
        </span>
        <span v-else key="del" class="c-button--center-icon">
          <X />
        </span>
      </Transition>
    </button>

    <input
      v-model="search"
      type="search"
      class="c-word-search__search-input c-input"
      aria-label="Suche nach einem Berliner Word"
      placeholder="Durchsuche den Berliner-Wortschatz"
      autocomplete="off"
      @input="updateSearch()"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import Search from "virtual:icons/lucide/search";
import Command from "virtual:icons/lucide/command";
import X from "virtual:icons/lucide/x";

interface SearchWordsProps {
  buttonPosition?: "left" | "right";
}

const { buttonPosition = "left" } = defineProps<SearchWordsProps>();

const search = ref("");
const searchLength = computed(() => search.value.length);
const toggleShowAndClearIcon = ref(true);

const emit = defineEmits(["update:search"]);

const updateSearch = () => {
  emit("update:search", search);
};

const buttonActions = () => {
  if (searchLength.value > 0) {
    search.value = "";
  }
};

const toggleSearchClearIcons = () => {
  if (searchLength.value === 0) {
    toggleShowAndClearIcon.value = true;
  } else {
    toggleShowAndClearIcon.value = false;
  }
};
</script>

<style lang="scss">
@use "@styles/components/word-search";
</style>
