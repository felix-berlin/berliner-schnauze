<template>
  <div class="c-filter-dropdown">
    <VDropdown
      placement="bottom"
      popper-class="c-filter-dropdown__dropdown"
      distance="9"
      container=".c-filter-dropdown"
      :shown="hideDropdown"
      :delay="{ show: 0, hide: 0 }"
    >
      <button
        type="button"
        :class="[
          'c-button c-button--center-icon c-button--filter c-button--dashed-border',
          { 'has-active-filter': wordSearch.activeLetterFilter },
        ]"
      >
        <span class="c-button--center-icon">
          <Filter />
        </span>
        alphabetisch
      </button>

      <template #popper>
        <LetterFilter />
      </template>
    </VDropdown>

    <button
      v-if="wordSearch.activeLetterFilter"
      type="button"
      class="c-filter-dropdown__active-filter c-button c-button--center-icon"
      @click="setLetterFilter('')"
    >
      <span>{{ wordSearch.activeLetterFilter }}</span>
      <X width="10" height="10" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import X from "virtual:icons/lucide/x";
import Filter from "virtual:icons/lucide/filter";
import LetterFilter from "@components/filter/LetterFilter.vue";
import { useStore } from "@nanostores/vue";
import { onSet } from "nanostores";
import { $wordSearch, setLetterFilter } from "@stores/index";

const wordSearch = useStore($wordSearch);
const hideDropdown = ref(false);

/**
 * If the active letter filter changes, hide the dropdown
 *
 * @return  {void}
 */
onSet($wordSearch, ({ newValue }): void => {
  if (wordSearch.value.activeLetterFilter === newValue.activeLetterFilter) {
    return;
  }

  hideDropdown.value = true;

  setTimeout(() => {
    hideDropdown.value = false;
  }, 0);
});
</script>

<style lang="scss">
@use "@styles/components/filter-dropdown";
</style>
