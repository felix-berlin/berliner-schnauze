<template>
  <article
    :id="'word' + source.ID"
    :ref="'word' + source.ID"
    :key="source.ID"
    :data-group="source.group"
    class="c-word-list__word"
    :class="{'has-translation': source.translations, }"
    data-track-content
    data-content-name="word"
  >
    <div :class="[{'has-example': source.examples}, 'c-word-list__header-wrapper']">
      <dl class="c-word-list__header">
        <dt class="c-word-list__berlinerisch" :data-content-piece="source.berlinerisch">
          <NuxtLink :to="'words/' + source.ID">
            {{ source.berlinerisch }}
          </NuxtLink>
        </dt>

        <WordTranslations
          v-for="(translation, translationIndex) in source.translations"
          :key="translationIndex"
          :translation="translation"
          elements="dd"
          :child-element="false"
          class="c-word-list__translation"
        />
      </dl>

      <VDropdown
        placement="bottom-end"
        class="c-word-list--word-option"
        distance="9"
        :delay="wordButtonClicked ? {hide: 10000} : {hide: 0}"
        :shown="wordButtonClicked"
        theme="word-options"
      >
        <button type="button" class="c-button c-button--center-icon c-button--word-option c-button--dashed-border" aria-label="Website Menu Navigation">
          <span class="u-icon-untouchable c-button--center-icon">
            <MoreVertical :size="18" />
          </span>
        </button>

        <template #popper>
          <button
            ref="copyUrlButton"
            aria-label="Link zum Wort kopieren"
            type="button"
            class="c-word-list__copy-button c-button c-button--center-icon c-button--dashed-border"
            :class="{ 'is-success': wordLinkCopied === index }"
            @click="copyWordPageUrlToClipboard(source.ID, index)"
          >
            <span ref="copyUrlLinkIcon" class="c-word-list__icon-button" :class="{ 'is-hidden': wordLinkCopied === index }">
              <Link :size="18" />
            </span>
            <span ref="copyUrlCheckIcon" class="c-word-list__icon-button c-word-list__icon-button--success" :class="{ 'is-hidden': wordLinkCopied !== index }">
              <CheckCircle2 :size="18" />
            </span>
            <span class="c-word-list__copy-text">Link kopieren</span>
          </button>
          <button
            ref="copyWordButton"
            aria-label="Wort kopieren"
            type="button"
            class="c-word-list__copy-button c-button c-button--center-icon c-button--dashed-border"
            :class="{ 'is-success': wordCopied === index }"
            @click="copyNameToClipboard(source.ID, index)"
          >
            <span ref="copyWordLinkIcon" class="c-word-list__icon-button" :class="{ 'is-hidden': wordCopied === index }">
              <Copy :size="18" />
            </span>
            <span ref="copyWordCheckIcon" class="c-word-list__icon-button" :class="{ 'is-hidden': wordCopied !== index }">
              <CheckCircle2 :size="18" />
            </span>
            <span class="c-word-list__copy-text">Wort kopieren</span>
          </button>
        </template>
      </VDropdown>
    </div>

    <WordExamples :examples="source.examples" />

    <NuxtLink v-if="source.learn_more || source.related_words || source.word_type" :to="'words/' + source.ID" class="c-word-list__learn-more c-button u-button-reset">
      <Info :size="20" /> mehr erfahren
    </NuxtLink>
  </article>
</template>

<script>
import { Copy, CheckCircle2, MoreVertical, Info, Link } from 'lucide-vue'

export default {
  name: 'WordSingle',

  components: {
    Copy,
    CheckCircle2,
    MoreVertical,
    Info,
    // eslint-disable-next-line
    Link
  },
  props: {
    index: {
      type: [String, Number],
      required: true
    },
    source: { // here is: {uid: 'unique_1', text: 'abc'}
      type: Object,
      default () {
        return {}
      }
    }
  },

  data () {
    return {
      wordCopied: '',
      wordLinkCopied: '',
      wordButtonClicked: false
    }
  },

  methods: {
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

      this.wordCopied = index
      this.wordButtonClicked = true

      setTimeout(() => {
        this.wordCopied = null
        this.wordButtonClicked = false
      }, 1500)
    },

    copyWordPageUrlToClipboard (id, index) {
      // const port = process.env.NODE_ENV === 'development' ? ':' + window.location.port : ''
      const getWordUrl = window.location.protocol + '//' + window.location.hostname + '/words/' + id

      this.copyToClipboard(getWordUrl, 'url')
      this.wordLinkCopied = index
      this.wordButtonClicked = true

      setTimeout(() => {
        this.wordLinkCopied = null
        this.wordButtonClicked = false
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
