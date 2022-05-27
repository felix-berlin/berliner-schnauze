<template>
  <!-- <WordSingle v-for="(word, index) in searchDataResults" :key="word.ID" :word="word" :index="index" /> -->
  <virtual-list
    ref="wordList"
    class="c-word-list"
    data-key="ID"
    :data-sources="searchDataResults"
    :data-component="item"
    :page-mode="true"
    :estimate-size="270"
    wrap-class="c-word-list__list u-list-reset"
    wrap-tag="ul"
    item-class="c-word-list__item"
    item-tag="li"
  />
</template>

<script>
import VirtualList from 'vue-virtual-scroll-list'
import { mapGetters, mapActions } from 'vuex'
import WordSingle from './word/word'

export default {
  name: 'WordList',

  components: {
    VirtualList
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
      },
      item: WordSingle
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
