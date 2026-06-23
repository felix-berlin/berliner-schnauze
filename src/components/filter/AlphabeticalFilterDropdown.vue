<template>
  <div class="c-filter-dropdown">
    <DropdownPopover
      ref="dropdownRef"
      placement="bottom"
      :offset="9"
      :class="{ 'has-active-filter': wordSearch.activeLetterFilter }"
      class="c-filter-dropdown__trigger-wrapper"
    >
      <template #default="{ triggerProps }">
        <button
          v-bind="triggerProps"
          type="button"
          class="c-button c-button--center-icon"
        >
          <span aria-hidden="true">
            <Filter />
          </span>
          alphabetisch
        </button>
      </template>

      <template #panel>
        <LetterFilter />
      </template>
    </DropdownPopover>

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
import DropdownPopover from "@components/DropdownPopover.vue";
import LetterFilter from "@components/filter/LetterFilter.vue";
import { useStore } from "@nanostores/vue";
import { $wordSearch, setLetterFilter } from "@stores/wordList.ts";
import { onSet } from "nanostores";
import Filter from "virtual:icons/lucide/filter";
import X from "virtual:icons/lucide/x";
import { ref } from "vue";

const wordSearch = useStore($wordSearch);
const dropdownRef = ref<InstanceType<typeof DropdownPopover>>();

onSet($wordSearch, ({ newValue }): void => {
  if (wordSearch.value.activeLetterFilter === newValue.activeLetterFilter) {
    return;
  }
  dropdownRef.value?.close();
});
</script>

<style lang="scss">
@use "@styles/components/filter-dropdown";
</style>
