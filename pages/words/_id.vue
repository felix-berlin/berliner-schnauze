<template>
  <main class="c-main c-content">
    <button type="button" aria-label="Zurück" class="c-button c-button--back u-button-reset" @click="$router.back()">
      <ArrowLeft /> zurück
    </button>

    <article class="c-single-word">
      <h1 class="c-single-word__word">
        {{ word.berlinerisch }}
      </h1>
      <h2 class="c-single-word__sub-headline">
        Bedeutung:
      </h2>
      <p class="c-single-word__translation" v-html="word.translation" />
      <h2 class="c-single-word__sub-headline">
        Beispiel:
      </h2>
      <div class="c-single-word__example-wrapper">
        <Quote :size="24" :stroke-width="0" class="c-single-word__quote-icon" />
        <p class="c-single-word__example" v-html="word.example" />
      </div>
    </article>
  </main>
</template>

<script>
import { ArrowLeft, Quote } from 'lucide-vue'

export default {

  // async asyncData ({ params, $axios, $config }) {
  //   const word = await $axios.$get(`${$config.baseApiUrl}/wp-json/berliner-schnauze/v1/words/${params.id}`)
  //   // console.log(word)
  //   return { word }
  // },

  components: {
    ArrowLeft,
    Quote
  },

  data () {
    return {
    }
  },

  head () {
    return {
      title: this.word.berlinerisch + ' | Bedeutung, Definition, Beispiel - Berliner Schnauze',
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
  }

}
</script>
