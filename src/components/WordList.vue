<template>
  <!-- vue-virtual-scroller@next -->
  <!-- <DynamicScroller
    :items="filteredWordList"
    :min-item-size="116"
    :buffer="100"
    class="c-word-list"
    list-class="c-word-list__list"
    item-class="c-word-list__item"
    page-mode
  >
    <template #default="{ item, index, active }">
      <DynamicScrollerItem
        :item="item"
        :active="active"
        :size-dependencies="[item.wordProperties.translations]"
        :data-index="index"
      >
        <div class="c-word-list__word-wrap">
          <SingleWord :source="item" :index="index" />
        </div>
      </DynamicScrollerItem>
    </template>
  </DynamicScroller> -->

  <!-- vue3-virtual-scroll-list -->
  <!-- <VirtualList
    ref="wordList"
    class="c-word-list"
    data-key="id"
    :data-sources="filteredWordList"
    :data-component="SingleWordItem"
    :page-mode="true"
    :estimate-size="270"
    wrap-class="c-word-list__list u-list-reset"
    wrap-tag="ul"
    item-class="c-word-list__item"
    item-tag="li"
  >
  </VirtualList> -->

  <WindowVirtualizer v-slot="{ item, index }" :data="mutableFilteredWordList" class="c-word-list">
    <SingleWord :key="index" :source="item" :style="{ 'margin-bottom': '1.75rem' }" />
  </WindowVirtualizer>
</template>

<script setup lang="ts">
import { computed } from "vue";
// import "vue-virtual-scroller/dist/vue-virtual-scroller.css";
import SingleWord from "@components/word/SingleWord.vue";
// import { words as wordList } from "@stores/index.ts";
import { useStore } from "@nanostores/vue";
import { $filteredWordList } from "@stores/index.ts";
// import VirtualList from "vue3-virtual-scroll-list";
import { WindowVirtualizer } from "virtua/vue";

// const SingleWordItem = shallowRef(SingleWord);
const filteredWordList = useStore($filteredWordList);
const mutableFilteredWordList = computed(() => [...filteredWordList.value]);
</script>

<style lang="scss">
@use "@styles/components/word-list";
</style>
