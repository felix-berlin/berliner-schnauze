<template>
  <DynamicScroller :items="words" :min-item-size="54" class="scroller c-word-list">
    <template #default="{ item, index, active }">
      <DynamicScrollerItem
        :item="item"
        :active="active"
        :size-dependencies="[item.id]"
        :data-index="index"
      >
        <SingleWord :source="item" :index="index" />
      </DynamicScrollerItem>
    </template>
  </DynamicScroller>
</template>

<script setup lang="ts">
import "vue-virtual-scroller/dist/vue-virtual-scroller.css";
import SingleWord from "@components/word/SingleWord.vue";
import type { Word } from "../stores/index";

interface WordListProps {
  words: Word[];
}

const { words } = defineProps<WordListProps>();
</script>

<style lang="scss">
@use "@styles/components/word-list";
.scroller {
  height: 100%;
}
</style>
