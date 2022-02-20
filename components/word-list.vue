<template>
  <div class="c-word-list">
    <!-- Search -->
    <SearchWords :focus-on-page-load="true" placeholder="Durchsuche den Berliner-Wortschatz" />

    <!-- Filter -->
    <!-- <a href="javascript:" @click="doSort('berlinerisch')">Berlinerisch<span v-if="sort.field=='berlinerisch'">({{ sort.desc?'desc':'asc' }})</span></a> -->

    <!-- List -->
    <section ref="wordList" class="c-word-list__list">
      <LoadingSpinner :show="getWordLoadingStatus" />

      <article
        v-for="(item, index) in searchDataResults"
        :id="'word' + item.ID"
        :ref="'word' + item.ID"
        :key="item.ID"
        :data-group="item.group"
        class="c-word-list__word"
        :class="{'has-translation': item.translation, 'has-example': item.example}"
        data-track-content
        data-content-name="word"
      >
        <dl class="c-word-list__header">
          <dt class="c-word-list__berlinerisch" :data-content-piece="item.berlinerisch" v-text="item.berlinerisch" />
          <dd class="c-word-list__translation" v-html="item.translation" />
        </dl>
        <div class="c-word-list__divider-wrapper">
          <div v-if="item.example" class="c-word-list__divider" />
          <div class="c-word-list__copy-buttons">
            <button
              ref="copyUrlButton"
              aria-label="Link zum Wort kopieren"
              type="button"
              class="c-word-list__copy-button c-button c-button--center-icon"
              @click="copyWordUrlToClipboard(item.ID, index)"
            >
              <span ref="copyUrlLinkIcon" class="c-word-list__icon-button">
                <Link />
              </span>
              <span ref="copyUrlCheckIcon" class="c-word-list__icon-button c-word-list__icon-button--success is-hidden">
                <CheckCircle2 />
              </span>
              <span ref="copyUrlErrorIcon" class="c-word-list__icon-button is-hidden">
                <XCircle />
              </span>
            </button>
            <button ref="copyWordButton" aria-label="Wort kopieren" type="button" class="c-word-list__copy-button c-button c-button--center-icon" @click="copyNameToClipboard(item.ID, index)">
              <span ref="copyWordLinkIcon" class="c-word-list__icon-button">
                <Copy />
              </span>
              <span ref="copyWordCheckIcon" class="c-word-list__icon-button is-hidden">
                <CheckCircle2 />
              </span>
              <span ref="copyWordErrorIcon" class="c-word-list__icon-button is-hidden">
                <XCircle />
              </span>
            </button>
          </div>
        </div>
        <div v-if="item.example" class="c-word-list__example-wrapper">
          <Quote :size="44" :stroke-width="0" class="c-word-list__quote-icon" />
          <p class="c-word-list__example" v-html="item.example" />
        </div>
      </article>
    </section>
    <!-- <Sidebar /> -->
  </div>
</template>

<script>
import { Copy, Link, Quote, CheckCircle2, XCircle } from 'lucide-vue'
import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'WordList',

  components: {
    Copy,
    Link,
    Quote,
    CheckCircle2,
    XCircle
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
            'berlinerisch', 'translation'
          ]
        }
      }
    }
  },

  computed: {
    ...mapGetters(['berlinerWords', 'berlinerWordsGrouped', 'berlinerWordCount', 'getWordLoadingStatus', 'getWordSearch']),

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

  created () {
    this.fetchBerlinWords()
  },

  mounted () {
    if (window.location.hash.length) {
      const currentHash = window.location.hash
      this.$nextTick(() => {
        if (this.getWordLoadingStatus === true) {
          // TODO: find a better way
          setTimeout(() => {
            const linkToElement = document.getElementById(currentHash.replace('#', ''))

            // Add focus class
            linkToElement.classList.add('is-focused')

            // Scroll to Element
            this.$smoothScrollTo(linkToElement, -200)

            // Remoce focus class after time
            setTimeout(() => {
              linkToElement.classList.remove('is-focused')
            }, 1500)
          }, 1000)
        }
      })
    }
  },

  methods: {
    ...mapActions(['fetchBerlinWords', 'updateDictionaryPosition']),

    copyNameToClipboard (id, index) {
      const getWord = document.querySelector('#word' + id + ' .c-word-list__berlinerisch').innerText

      this.copyToClipboard(getWord, 'name')
      this.toggleCopyIcons('copyWordLinkIcon', 'copyWordCheckIcon', 'copyWordButton', index)
    },

    copyWordUrlToClipboard (id, index) {
      const getWordUrl = window.location.protocol + '//' + window.location.hostname + '#word' + id

      this.copyToClipboard(getWordUrl, 'url')

      this.toggleCopyIcons('copyUrlLinkIcon', 'copyUrlCheckIcon', 'copyUrlButton', index)
    },

    toggleCopyIcons (linkIcon, CheckIcon, button, index) {
      this.$refs[button][index].classList.add('is-success')
      this.$refs[linkIcon][index].classList.add('is-hidden')
      this.$refs[CheckIcon][index].classList.remove('is-hidden')
      setTimeout(() => {
        this.$refs[button][index].classList.remove('is-success')
        this.$refs[CheckIcon][index].classList.add('is-hidden')
        this.$refs[linkIcon][index].classList.remove('is-hidden')
      }, 1500)
    },

    copyToClipboard (textToCopy) {
      try {
        navigator.clipboard.writeText(textToCopy)
      } catch (err) {
        console.error(err)
      }
    },

    doSort (field) {
      if (field === this.sort.field) {
        this.sort.desc = !this.sort.desc
      } else {
        this.sort.field = field
        this.sort.desc = true
      }
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
