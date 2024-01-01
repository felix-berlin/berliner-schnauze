<template>
  <DynamicScroller
    :items="filteredWordList"
    :min-item-size="116"
    :buffer="100"
    class="c-word-list"
    list-class="c-word-list__list"
    item-class="c-word-list__item"
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
  </DynamicScroller>
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
</template>

<script setup lang="ts">
import { shallowRef } from "vue";
import SingleWord from "@components/word/SingleWord.vue";
import { useStore } from "@nanostores/vue";
import { $filteredWordList } from "@stores/index";
import VirtualList from "vue3-virtual-scroll-list";
import "vue-virtual-scroller/dist/vue-virtual-scroller.css";
const SingleWordItem = shallowRef(SingleWord);
const filteredWordList = useStore($filteredWordList);
</script>

<style lang="scss">
@use "@styles/components/word-list";
</style>
