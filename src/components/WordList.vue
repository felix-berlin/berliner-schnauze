<template>
  <DynamicScroller :items="wordSearchIndex" :min-item-size="54" class="scroller c-word-list">
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
  console.log("index", fuse);

  const results = fuse.search(search);
  console.log("results", results);

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
.scroller {
  height: 100%;
}
</style>
