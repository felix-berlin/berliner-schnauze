<template>
  <main class="c-content o-legal-pages">
    <LoadingSpinner :show="$fetchState.pending" />
    <div v-if="status === 'publish'" v-html="content" />
  </main>
</template>

<script>
export default {
  name: 'PrivacyPolicyPage',

  data () {
    return {
      status: '',
      content: ''
    }
  },

  async fetch () {
    return await fetch(`${this.$config.baseApiUrl}/wp-json/wp/v2/pages/4715`)
      .then(res => res.json())
      .then((res) => {
        this.content = res.content.rendered
        this.status = res.status
      }).catch((error) => {
        this.$sentry.captureException(new Error(error))
      })
  },

  created () {
    console.log(process.env.NODE_ENV === 'development')
  }
}
</script>
