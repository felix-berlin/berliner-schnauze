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
          <span
            v-if="isWordOfTheDay"
            v-tooltip="{ content: `${source.berlinerisch} ist das heutige Wort des Tages`,
                         distance: 10,
                         placement: 'top'}"
            class="c-word-list__crown"
            aria-hidden="true"
          >
            <Crown />
          </span>
          <NuxtLink :to="$routeToWord(source.post_name)">
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
        <button
          type="button"
          class="c-button c-button--center-icon c-button--word-option c-button--dashed-border"
          aria-label="Website Menu Navigation"
        >
          <span class="u-icon-untouchable c-button--center-icon">
            <MoreVertical :size="18" />
          </span>
        </button>

        <template #popper>
          <button
            v-if="canShare"
            aria-label="Wort teilen"
            type="button"
            class="c-word-list__copy-button c-button c-button--dashed-border"
            :class="{ 'is-success': wordShared === index }"
            @click="shareWord(source.post_name, index)"
          >
            <span class="c-word-list__icon-button" :class="{ 'is-hidden': wordShared === index }">
              <Share2 :size="18" />
            </span>
            <span class="c-word-list__icon-button" :class="{ 'is-hidden': wordShared !== index }">
              <CheckCircle2 :size="18" />
            </span>
            <span class="c-word-list__copy-text">Wort teilen</span>
          </button>

          <button
            v-if="!canShare"
            aria-label="Link zum Wort kopieren"
            type="button"
            class="c-word-list__copy-button c-button c-button--dashed-border"
            :class="{ 'is-success': wordLinkCopied === index }"
            @click="copyWordPageUrlToClipboard(source.post_name, index)"
          >
            <span class="c-word-list__icon-button" :class="{ 'is-hidden': wordLinkCopied === index }">
              <Link :size="18" />
            </span>
            <span class="c-word-list__icon-button" :class="{ 'is-hidden': wordLinkCopied !== index }">
              <CheckCircle2 :size="18" />
            </span>
            <span class="c-word-list__copy-text">Link kopieren</span>
          </button>

          <button
            aria-label="Wort kopieren"
            type="button"
            class="c-word-list__copy-button c-button c-button--dashed-border"
            :class="{ 'is-success': wordCopied === index }"
            @click="copyNameToClipboard(source.berlinerisch, index)"
          >
            <span class="c-word-list__icon-button" :class="{ 'is-hidden': wordCopied === index }">
              <Copy :size="18" />
            </span>
            <span class="c-word-list__icon-button" :class="{ 'is-hidden': wordCopied !== index }">
              <CheckCircle2 :size="18" />
            </span>
            <span class="c-word-list__copy-text">Wort kopieren</span>
          </button>
        </template>
      </VDropdown>
    </div>

    <WordExamples :examples="source.examples" />

    <NuxtLink v-if="source.learn_more || source.related_words || source.word_type" :to="$routeToWord(source.post_name)" class="c-word-list__learn-more c-button u-button-reset">
      <Info :size="20" /> mehr erfahren
    </NuxtLink>
  </article>
</template>

<script>
import { Copy, CheckCircle2, MoreVertical, Info, Link, Share2, Crown } from 'lucide-vue'

export default {
  name: 'WordSingle',

  components: {
    Copy,
    CheckCircle2,
    MoreVertical,
    Share2,
    Info,
    // eslint-disable-next-line
    Link,
    Crown
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
      wordShared: '',
      wordButtonClicked: false,
      canShare: null,
      isWordOfTheDay: false
    }
  },

  mounted () {
    this.isWordOfTheDay = this.source.ID === this.$store.state.wordOfTheDay.ID

    if (navigator.share) {
      this.canShare = true
    } else {
      this.canShare = false
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
    copyNameToClipboard (name, index) {
      this.copyToClipboard(name)

      this.wordCopied = index
      this.wordButtonClicked = true

      setTimeout(() => {
        this.wordCopied = null
        this.wordButtonClicked = false
      }, 1500)
    },

    copyWordPageUrlToClipboard (slug, index) {
      this.copyToClipboard(this.$routeToWord(slug, true))
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
    },

    shareWord (slug, index) {
      const shareData = {
        title: slug + ' - Berliner Schnauze',
        text: 'Lerne mehr über das Berliner Wort: ' + slug,
        url: this.$routeToWord(slug)
      }
      try {
        navigator.share(shareData)
      } catch (err) {
        console.log(err)
      } finally {
        this.wordShared = index
        this.wordButtonClicked = true

        setTimeout(() => {
          this.wordShared = null
          this.wordButtonClicked = false
        }, 1500)
      }
    }
  }
}
</script>
