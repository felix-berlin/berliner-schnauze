<template>
  <main class="c-main c-content">
    <NuxtLink :to="'/'" class="c-button c-button--back u-button-reset">
      <ArrowLeft /> zurück
    </NuxtLink>

    <article class="c-single-word">
      <header class="c-single-word__header">
        <h1 class="c-single-word__word">
          {{ word.berlinerisch }}
        </h1>
      </header>

      <div v-if="word.learn_more" class="c-single-word__learn-more-wrapper">
        <Info /> <a :href="word.learn_more" target="_blank" class="c-single-word__learn-more-link">Erfahre mehr über dieses Wort <span class="c-single-word__learn-more-link-icon"><ExternalLink :size="10" /></span></a>
      </div>

      <h2 v-if="word.translations" class="c-single-word__sub-headline">
        Bedeutung:
      </h2>
      <WordTranslations :translations="word.translations" root-bem-class="c-single-word" />

      <h2 v-if="word.examples" class="c-single-word__sub-headline">
        Beispiel:
      </h2>
      <WordExamples :examples="word.examples" root-bem-class="c-single-word" />

      <div v-if="word.related_words" class="c-single-word__related-words-wrapper">
        <h3>Verwandte Worte:</h3>
        <ul class="c-single-word__related-words-list">
          <li v-for="(related_word, index) in word.related_words" :key="index" class="c-single-word__related-word">
            <nuxt-link :to="'/words/' + related_word.ID" class="c-single-word__related-word-link">
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
import { ArrowLeft, Info, ExternalLink } from 'lucide-vue'

export default {

  // async asyncData ({ params, $axios, $config }) {
  //   const word = await $axios.$get(`${$config.baseApiUrl}/wp-json/berliner-schnauze/v1/words/${params.id}`)
  //   // console.log(word)
  //   return { word }
  // },

  components: {
    ArrowLeft,
    Info,
    ExternalLink
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
      return this.$store.state.words.find(word => word.ID === Number(this.$route.params.id))
    }
  },

  methods: {
    formatedDate (date, locale = 'de-DE') {
      const dateToFormat = new Date(date)

      return dateToFormat.toLocaleString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
    }
  }

}
</script>
