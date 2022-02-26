<template>
  <main class="c-main c-content">
    <dl class="c-word-list__header">
      <dt class="c-word-list__berlinerisch" :data-content-piece="word.berlinerisch">
        {{ word.berlinerisch }}
      </dt>
      <dd class="c-word-list__translation" v-html="word.translation" />
    </dl>
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
    word () {
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
