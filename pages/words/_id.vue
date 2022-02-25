<template>
  <main class="c-main c-content">
    <h1>{{ words.berlinerisch }}</h1>
    <!-- <p>{{ word[0].ID }}</p> -->
    <b>{{ words.ID }}</b>
  </main>
</template>

<script>
export default {

  // async asyncData ({ params, $axios, $config }) {
  //   const word = await $axios.$get(`${$config.baseApiUrl}/wp-json/berliner-schnauze/v1/words/${params.id}`)
  //   // console.log(word)
  //   return { word }
  // },

  data () {
    return {
      id: ''
    }
  },

  computed: {
    words () {
      return this.$store.state.words.find(word => word.ID === Number(this.$route.params.id))
    }
  },

  mounted () {
    console.log(this.$store.state.words.find(word => word.ID === 4620))
    console.log(this.$store.state.words.find(word => word.ID === Number(this.$route.params.id)))
    console.log(this.$route.params.id)
  }

}
</script>
