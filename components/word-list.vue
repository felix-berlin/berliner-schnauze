<template>
  <component :is="element" ref="wordList" class="c-word-list">
    <LoadingSpinner :show="getWordLoadingStatus" />
    <article
      v-for="(word, index) in searchDataResults"
      :id="'word' + word.ID"
      :ref="'word' + word.ID"
      :key="word.ID"
      :data-group="word.group"
      class="c-word-list__word"
      :class="{'has-translation': word.translation, }"
      data-track-content
      data-content-name="word"
    >
      <div :class="[{'has-example': word.example}, 'c-word-list__header-wrapper']">
        <dl class="c-word-list__header">
          <dt class="c-word-list__berlinerisch" :data-content-piece="word.berlinerisch">
            <NuxtLink :to="'words/' + word.ID">
              {{ word.berlinerisch }}
            </NuxtLink>
          </dt>
          <dd class="c-word-list__translation" v-html="word.translation" />
        </dl>

        <Dropdown menu-align="left" :modifier="['c-word-list--word-option']" button-modifier="c-button--center-icon c-button--word-option c-button--dashed-border" button-aria-label="Wort Menu öffnen">
          <template #title>
            <span class="u-icon-untouchable c-button--center-icon">
              <MoreVertical :size="18" />
            </span>
          </template>
          <template #content>
            <button
              ref="
              copyUrlButton"
              aria-label="Link zum Wort kopieren"
              type="button"
              class="c-word-list__copy-button c-button c-button--center-icon c-button--dashed-border"
              @click="copyWordPageUrlToClipboard(word.ID, index)"
            >
              <span ref="copyUrlLinkIcon" class="c-word-list__icon-button">
                <Link :size="18" />
              </span>
              <span ref="copyUrlCheckIcon" class="c-word-list__icon-button c-word-list__icon-button--success is-hidden">
                <CheckCircle2 :size="18" />
              </span>
              <span ref="copyUrlErrorIcon" class="c-word-list__icon-button is-hidden">
                <XCircle :size="18" />
              </span>
              <span class="c-word-list__copy-text">Link kopieren</span>
            </button>
            <button ref="copyWordButton" aria-label="Wort kopieren" type="button" class="c-word-list__copy-button c-button c-button--center-icon c-button--dashed-border" @click="copyNameToClipboard(word.ID, index)">
              <span ref="copyWordLinkIcon" class="c-word-list__icon-button">
                <Copy :size="18" />
              </span>
              <span ref="copyWordCheckIcon" class="c-word-list__icon-button is-hidden">
                <CheckCircle2 :size="18" />
              </span>
              <span ref="copyWordErrorIcon" class="c-word-list__icon-button is-hidden">
                <XCircle :size="18" />
              </span>
              <span class="c-word-list__copy-text">Wort kopieren</span>
            </button>
          </template>
        </Dropdown>
      </div>

      <div v-if="word.example" class="c-word-list__divider" />

      <div v-if="word.example" class="c-word-list__example-wrapper">
        <Quote :size="44" :stroke-width="0" class="c-word-list__quote-icon" />
        <p class="c-word-list__example" v-html="word.example" />
      </div>
    </article>
  </component>
</template>

<script>
import { Copy, Link, Quote, CheckCircle2, XCircle, MoreVertical } from 'lucide-vue'
import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'WordList',

  components: {
    Copy,
    Link,
    Quote,
    CheckCircle2,
    XCircle,
    MoreVertical
  },

  props: {
    element: {
      type: String,
      default: 'section'
    }
  },

  data () {
    return {
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
    ...mapActions(['updateDictionaryPosition']),

    /**
     * Copy target word to the clipboard
     *
     * @param   {Number}  id     Word ID
     * @param   {Number}  index  Word index
     *
     * @return  {Function}       Copy the word and toggle the icons
     */
    copyNameToClipboard (id, index) {
      const getWord = document.querySelector('#word' + id + ' .c-word-list__berlinerisch').innerText

      this.copyToClipboard(getWord, 'name')
      this.toggleCopyIcons('copyWordLinkIcon', 'copyWordCheckIcon', 'copyWordButton', index)
    },

    /**
     * Copy the word url to the clipboard
     *
     * @param   {Number}  id     Word ID
     * @param   {Number}  index  Word index
     *
     * @return  {Function}       Copy the word url and toggle the icons
     */
    copyWordUrlToClipboard (id, index) {
      const port = process.env.NODE_ENV === 'development' ? ':' + window.location.port : ''
      const getWordUrl = window.location.protocol + '//' + window.location.hostname + port + '#word' + id

      this.copyToClipboard(getWordUrl, 'url')

      this.toggleCopyIcons('copyUrlLinkIcon', 'copyUrlCheckIcon', 'copyUrlButton', index)
    },

    copyWordPageUrlToClipboard (id, index) {
      const port = process.env.NODE_ENV === 'development' ? ':' + window.location.port : ''
      const getWordUrl = window.location.protocol + '//' + window.location.hostname + port + '/words/' + id

      this.copyToClipboard(getWordUrl, 'url')

      this.toggleCopyIcons('copyUrlLinkIcon', 'copyUrlCheckIcon', 'copyUrlButton', index)
    },

    /**
     * Toggle word icon classes
     *
     * @param   {String}  linkIcon   LinkIcon ref
     * @param   {String}  CheckIcon  Check icon ref
     * @param   {String}  button     Button ref
     * @param   {Number}  index      Current index
     */
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

    /**
     * Copy a given string to the clipboard
     *
     * @param   {String}  textToCopy  String to copy
     */
    copyToClipboard (textToCopy) {
      try {
        navigator.clipboard.writeText(textToCopy)
      } catch (error) {
        this.$sentry.captureException(error)
      }
    }
  }

}
</script>
