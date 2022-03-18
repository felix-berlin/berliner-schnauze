<template>
  <main class="c-main c-content">
    <button type="button" aria-label="Zurück" class="c-button" @click="$router.back()">
      <ArrowLeft />
    </button>

    <h1>
      {{ word.berlinerisch }}
    </h1>
    <h2>Bedeutung:</h2>
    <p v-html="word.translation" />
    <h2>
      Beispiel:
    </h2>
    <p v-html="word.example" />
  </main>
</template>

<script>
import { ArrowLeft } from 'lucide-vue'

export default {

  // async asyncData ({ params, $axios, $config }) {
  //   const word = await $axios.$get(`${$config.baseApiUrl}/wp-json/berliner-schnauze/v1/words/${params.id}`)
  //   // console.log(word)
  //   return { word }
  // },

  components: {
    ArrowLeft
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
