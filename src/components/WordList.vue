<template>
  <DynamicScroller
    :items="wordSearchIndex"
    :min-item-size="116"
    class="c-word-list"
    list-class="c-word-list__list"
    item-class="c-word-list__item"
    :prerender="10"
    page-mode
  >
    <template #default="{ item, index, active }">
      <DynamicScrollerItem
        :item="item"
        :active="active"
        :size-dependencies="[item.id]"
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
// import { useStore } from "@nanostores/vue";
import type { Word } from "@stores/index";
import Fuse from "fuse.js";

interface WordListProps {
  words: Word[];
  search: string;
}

const { words, search = "" } = defineProps<WordListProps>();
// const fuse = reactive({
//   search: "",
//   options: {
//     keys: ["berlinerisch", "translation"],
//   },
// });
//

// wordList.set(words);
// const berlinerWords = useStore(wordList);
// const cleanBerlinerWords = berlinerWords.map((word) => {
//   return word.wordProperties;
// });
const wordSearchIndex = computed(() => {
  const options = {
    keys: ["wordProperties.berlinerisch", "wordProperties.translation"],
  };

  const fuse = new Fuse(words, options);

  const results = fuse.search(search);

  const cleanResults = results.map((result) => {
    return result.item;
  });

  if (cleanResults.length === 0 || search === "") {
    return words;
  }

  return cleanResults;
});
</script>

<style lang="scss">
@use "@styles/components/word-list";
</style>
