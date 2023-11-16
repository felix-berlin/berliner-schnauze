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
          'c-button c-button--center-icon c-button--filter',
          // { 'has-active-filter': $store.getters.getLetterFilter },
        ]"
        aria-label="Filter"
      >
        <span class="u-icon-untouchable c-button--center-icon">
          <Filter />
        </span>
        alphabetisch
      </button>

      <template #popper>
        <LetterFilter :groups="props.groups" />
      </template>
    </VDropdown>

    <!-- <div
      v-if="$store.getters.getLetterFilter"
      class="c-filter-dropdown__active-filter"
      @click="$store.dispatch('filterByLetter', null)"
    >
      <span>{{ $store.getters.getLetterFilter }}</span
      ><span><X :width="10" height="10" /></span>
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import X from "virtual:icons/lucide/x";
import Filter from "virtual:icons/lucide/filter";
import { useStorage } from "@vueuse/core";
import LetterFilter from "@components/LetterFilter.vue";

interface AlphabeticalFilterDropdownProps {
  groups: string[];
}

const props = defineProps<AlphabeticalFilterDropdownProps>();

const hideDropdown = ref(false);
</script>

<style lang="scss">
@use "@styles/components/filter-dropdown";
</style>
