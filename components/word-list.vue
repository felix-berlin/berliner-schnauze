<template>
  <component :is="element" ref="wordList" class="c-word-list">
    <!-- <WordSingle v-for="(word, index) in searchDataResults" :key="word.ID" :word="word" :index="index" /> -->
    <!-- <virtual-list
      :data-key="'ID'"
      :data-sources="searchDataResults"
      :data-component="item"
      :page-mode="true"
      :wrap-class="'c-word-list__list'"
      :item-class="'c-word-list__item'"
    >
      <LoadingSpinner :show="getWordLoadingStatus" />
    </virtual-list> -->

    <RecycleScroller
      v-slot="{ item }"
      class="scroller"
      :items="searchDataResults"
      :item-size="300"
      :prerender="30"
      :page-mode="true"
      key-field="ID"
    >
      <WordSingle :source="item" :index="item.ID" />
    </RecycleScroller>
  </component>
</template>

<script>
import { RecycleScroller } from 'vue-virtual-scroller'
import VirtualList from 'vue-virtual-scroll-list'
import { mapGetters, mapActions } from 'vuex'
import WordSingle from './word/word'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

export default {
  name: 'WordList',

  components: {
    VirtualList,
    RecycleScroller,
    WordSingle
  },

  props: {
    element: {
      type: String,
      default: 'section'
    }
  },

  data () {
    return {
      fuse: {
        search: '',
        options: {
          keys: [
            'berlinerisch', 'translation'
          ]
        }
      }
    }
  },

  computed: {
    ...mapGetters(['berlinerWords', 'berlinerWordsGrouped', 'berlinerWordCount', 'getWordLoadingStatus', 'getWordSearch', 'getWordsSortedByDirection', 'getWordsFilteredByLetter', 'filter']),

    searchDataResults () {
      // Pre index all keys
      // const index = this.$fuse.createIndex(this.fuse.options.keys, this.berlinerWords)

      // Init fuse
      const fuse = new this.$fuse(this.filter, this.fuse.options)

      // Get the search running
      const results = fuse.search(this.getWordSearch)

      const cleanResults = []
      for (const items of results) {
        const item = items.item
        const refIndex = items.refIndex
        const clean = Object.assign(item, { refIndex })
        cleanResults.push(clean)
      }

      // If there is no result display the full index
      if (!results.length) {
        return fuse.getIndex().docs
      }

      return cleanResults
    }

  },
  updated () {
    window._paq.push(['trackVisibleContentImpressions'])
    // Only for debugging
    // window._paq.push(['logAllContentBlocksOnPage'])
  },

  methods: {
    ...mapActions(['updateDictionaryPosition'])
  }

}
</script>
