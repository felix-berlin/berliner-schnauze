<template>
  <div class="c-word-list">
    <!-- Wordcount -->
    <div class="c-word-list__word-count">
      <span>Anzahl Wörter:</span>
      <span v-text="berlinerWordCount" />
    </div>

    <!-- Search -->
    <div class="c-word-list__search">
      <Search default-class="c-word-list__search-icon" />

      <input v-model="fuse.search" type="text" class="c-word-list__search-input" placeholder="Durchsuche den Berliner-Wortschatz">
    </div>

    <!-- Filter -->
    <a href="javascript:" @click="doSort('berlinerisch')">Berlinerisch<span v-if="sort.field=='berlinerisch'">({{ sort.desc?'desc':'asc' }})</span></a>

    <!-- List -->
    <section class="c-word-list__list">
      <article v-for="(item, index) in searchDataResults" :id="item.ID" :key="item.ID" :data-index="index" class="c-word-list__word">
        <p class="c-word-list__berlinerisch" v-text="item.berlinerisch" />
        <p class="c-word-list__translation" v-html="item.translation" />
        <i class="c-word-list__example" v-html="item.example" />
      </article>
    </section>
  </div>
</template>

<script>
import { Search } from 'lucide-vue'
import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'WordList',

  components: {
    Search
  },

  data () {
    return {
      berlinWords: this.$store.state.words,
      berlinWordsGrouped: this.berlinerWordsGrouped,
      groupNames: this.$store.state.groupNames,
      currentDictionaryPosition: '',
      intersectionOptions: {
        root: null,
        rootMargin: '0px 0px 0px 0px',
        threshold: 0.5 // [0.25, 0.75] if you want a 25% offset!
      },
      sort: {
        field: '',
        desc: false
      },
      fuse: {
        search: '',
        options: {
          keys: [
            'berlinerisch', 'translation', 'example'
          ]
        }

      }
    }
  },

  computed: {
    ...mapGetters(['berlinerWords', 'berlinerWordsGrouped', 'berlinerWordCount']),

    sortedData () {
      // if (!this.sort.field) {
      //   return this.items
      // }
      return this.berlinerWords.concat().sort((a, b) => {
        if (this.sort.desc) {
          return a[this.sort.field] > b[this.sort.field] ? -1 : 1
        } else {
          return a[this.sort.field] > b[this.sort.field] ? 1 : -1
        }
      })
    },

    searchDataResults () {
      // Pre index all keys
      const index = this.$fuse.createIndex(this.fuse.options.keys, this.berlinerWords)

      // Init fuse
      const fuse = new this.$fuse(this.berlinerWords, this.fuse.options, index)

      // Get the search running
      const results = fuse.search(this.fuse.search)

      // If there is no result display the full index
      if (!results.length) {
        return fuse.getIndex().docs
      }

      // Sort the object like the prev
      results.forEach((element) => {
        // fuse builds a complete new object with a index and item key
        // to get back to the previos object design we push back the item content
        results.push(element.item)
      })

      return results
    }

  },

  created () {
    this.fetchBerlinWords()
  },

  mounted () {
    // this.sortWords()

    // this.createGroups()
    // this.fetchWords('https://webshaped.de/wp-json/berlinerisch/v1/post')
  },

  methods: {
    ...mapActions(['fetchBerlinWords', 'updateDictionaryPosition']),

    doSort (field) {
      if (field === this.sort.field) {
        this.sort.desc = !this.sort.desc
      } else {
        this.sort.field = field
        this.sort.desc = true
      }
    },

    // createGroups () {
    //   this.groupNames.forEach((element) => {
    //     const groups = {
    //       mode: 'span',
    //       label: element,
    //       html: false,
    //       children: []
    //     }

    //     this.berlinWords.push(groups)
    //   })
    // },

    // fetchWords (url) {
    //   fetch(url)
    //     .then(r => r.json())
    //     .then((response) => {
    //       const words = response.map(x => x.word)
    //       words.forEach((word, index) => {
    //         this.wordCount = index
    //         const checkWord = word.berlinerisch.toLowerCase()
    //         const groupNamesLower = this.groupNames
    //         groupNamesLower.forEach((groupItem, index) => {
    //           if (checkWord.startsWith(groupItem.toLowerCase())) {
    //             this.words[index].children.push(word)
    //           }
    //         })
    //       })
    //     })
    // },

    // sortWords1 () {
    //   const words = this.berlinerWords.map(x => x.word)
    //   console.log(words)
    //   words.forEach((word, index) => {
    //     console.log(word)
    //     this.wordCount = index
    //     const checkWord = word.berlinerisch.toLowerCase()
    //     const groupNamesLower = this.groupNames
    //     groupNamesLower.forEach((groupItem, index) => {
    //       if (checkWord.startsWith(groupItem.toLowerCase())) {
    //         this.berlinWords[index].children.push(word)
    //       }
    //     })
    //   })
    // },

    sortWords () {
      console.log('funzt')
      // const words = this.berlinerWords.map(x => x.word)
      // console.log(words)
      this.berlinerWords.forEach((word, index) => {
        console.log(word, index)
        // this.wordCount = index
        // const checkWord = word.berlinerisch.toLowerCase()
        // const groupNamesLower = this.groupNames
        // groupNamesLower.forEach((groupItem, index) => {
        //   if (checkWord.startsWith(groupItem.toLowerCase())) {
        //     this.berlinWords[index].children.push(word)
        //   }
        // })
      })
    },

    onWaypoint ({ going, direction, el }) {
      const currentElementId = el.getAttribute('id')
      const currentElementRow = el.closest('.vgt-row-header')

      if (going === this.$waypointMap.GOING_IN) {
        console.log('waypoint going in! ' + currentElementId)

        // Save the current Element
        this.currentDictionaryPosition = currentElementId

        // Append a focus class to the active row
        currentElementRow.classList.add('is-active')

        // Remove the class after 2s
        setTimeout(() => {
          currentElementRow.classList.remove('is-active')
        }, 2000)

        // this.$store.commit('increment', { letter: currentElementId })
        this.updateDictionaryPosition(currentElementId)
      }

      // if (going === this.$waypointMap.GOING_OUT) {
      //   el.classList.remove('is-active')
      // }

      // if (direction === this.$waypointMap.DIRECTION_TOP) {
      //   console.log('waypoint going top! ' + currentElementId)
      // }
    }
  }

}
</script>
