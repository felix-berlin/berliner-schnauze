<template>
  <main class="c-main c-content">
    <NuxtLink :to="'/'" class="c-button c-button--back u-button-reset">
      <ArrowLeft /> zurück
    </NuxtLink>

    <article class="c-single-word">
      <header class="c-single-word__header">
        <span
          v-if="isWordOfTheDay"
          v-tooltip="{ content: `${word.berlinerisch} ist das heutige Wort des Tages`,
                       distance: 10,
                       placement: 'right'}"
          class="c-single-word__crown"
          aria-hidden="true"
        >
          <Crown />
        </span>
        <h1 class="c-single-word__word">
          {{ word.berlinerisch }}<span v-if="word.article" class="c-single-word__word-article">, {{ word.article }}</span>
        </h1>
      </header>

      <div v-if="word.learn_more" class="c-single-word__learn-more-wrapper">
        <Info /> <a :href="word.learn_more" target="_blank" class="c-single-word__learn-more-link">Erfahre mehr über dieses Wort <span class="c-single-word__learn-more-link-icon"><ExternalLink :size="10" /></span></a>
      </div>

      <div v-if="word.word_type" class="c-single-word__word-type-wrapper">
        <h2 class="c-single-word__sub-headline">
          Wortart:
        </h2>
        <p class="c-single-word__word-type" v-text="word.word_type[0].name" />
      </div>

      <div class="c-single-word__translation-wrapper">
        <h2 v-if="word.translations" class="c-single-word__sub-headline">
          Bedeutung:
        </h2>
        <ul class="c-single-word__translation">
          <WordTranslations v-for="(translation, translationIndex) in word.translations" :key="translationIndex" :translation="translation" elements="li" class="c-single-word__translation-item" />
        </ul>
      </div>

      <div class="c-single-word__examples-wrapper">
        <h2 v-if="word.examples" class="c-single-word__sub-headline">
          Beispiel:
        </h2>
        <WordExamples :examples="word.examples" root-bem-class="c-single-word" />
      </div>

      <div v-if="word.related_words" class="c-single-word__related-words-wrapper">
        <h3>Verwandte Worte:</h3>
        <ul class="c-single-word__related-words-list">
          <li v-for="(related_word, index) in word.related_words" :key="index" class="c-single-word__related-word">
            <nuxt-link :to="$routeToWord(related_word.post_name)" class="c-single-word__related-word-link">
              {{ related_word.post_title }}
            </nuxt-link>
          </li>
        </ul>
      </div>

      <footer class="c-single-word__footer">
        <p class="c-single-word__created">
          Wort erstellt am: {{ formatedDate(word.post_date) }}
        </p>
        <p class="c-single-word__modified">
          Bearbeitet am: {{ formatedDate(word.post_modified) }}
        </p>
      </footer>
    </article>
  </main>
</template>

<script>
import { ArrowLeft, Info, ExternalLink, Crown } from 'lucide-vue'

export default {

  // async asyncData ({ params, $axios, $config }) {
  //   const word = await $axios.$get(`${$config.baseApiUrl}/wp-json/berliner-schnauze/v1/words/${params.id}`)
  //   // console.log(word)
  //   return { word }
  // },

  components: {
    ArrowLeft,
    Info,
    ExternalLink,
    Crown
  },

  head () {
    return {
      title: this.word.berlinerisch + ' | Bedeutung, Definition, Beispiel',
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: this.word.berlinerisch + ' | Bedeutung, Definition & Beispiel des Berliner Wort'
        },
        {
          hid: 'og:title',
          property: 'og:title',
          content: this.word.berlinerisch + ' | Bedeutung, Definition, Beispiel - Berliner Schnauze'
        },
        {
          hid: 'og:description',
          property: 'og:description',
          content: this.word.berlinerisch + ' | Bedeutung, Definition & Beispiel des Berliner Wort'
        }
      ]
    }
  },

  computed: {
    word () {
      return this.$store.state.words.find(word => word.post_name === this.$route.params.slug)
    },

    isWordOfTheDay () {
      return this.word.ID === this.$store.state.wordOfTheDay.ID
    }
  },

  created () {
    this.$store.dispatch('loadWordOfTheDay')
  },

  methods: {
    formatedDate (date, locale = 'de-DE') {
      const dateToFormat = new Date(date)

      return dateToFormat.toLocaleString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
    }
  }

}
</script>
