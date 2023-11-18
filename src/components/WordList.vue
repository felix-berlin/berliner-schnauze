<template>
  <DynamicScroller
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
  </DynamicScroller>
</template>

<script setup lang="ts">
import { reactive, computed } from "vue";
import "vue-virtual-scroller/dist/vue-virtual-scroller.css";
import SingleWord from "@components/word/SingleWord.vue";
// import { words as wordList } from "@stores/index";
import { useStore } from "@nanostores/vue";
import { $filteredWordList } from "@stores/index";

const filteredWordList = useStore($filteredWordList);
</script>

<style lang="scss">
@use "@styles/components/word-list";
</style>
