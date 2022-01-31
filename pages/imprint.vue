<template>
  <main v-if="status === 'publish'" class="c-content">
    <LoadingSpinner :show="$fetchState.pending" />
    <h1 v-text="title" />
    <div v-html="content" />
  </main>
</template>

<script>
export default {
  name: 'ImprintPage',

  data () {
    return {
      status: '',
      title: 'Impressum',
      content: ''
    }
  },

  async fetch () {
    return await fetch('https://webshaped.de/wp-json/wp/v2/pages/4712')
      .then(res => res.json())
      .then((res) => {
        this.content = res.content.rendered
        this.status = res.status
      }).catch((error) => {
        this.$sentry.captureException(new Error(error))
      })
  }
}
</script>
