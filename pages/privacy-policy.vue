<template>
  <main class="c-content o-legal-pages">
    <div v-if="content.status === 'publish'" v-html="content.content.rendered" />
  </main>
</template>

<script>
export default {
  name: 'PrivacyPolicyPage',

  data () {
    return {
      content: {}
    }
  },

  async fetch () {
    await fetch(`${this.$config.baseApiUrl}/wp-json/wp/v2/pages/4715`)
      .then(res => res.json())
      .then((data) => {
        this.content = data
      })
      .catch((error) => { this.$sentry.captureException(error) })
  },

  head () {
    return {
      title: 'Datenschutzerklärung - Berliner Schnauze',
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: 'Die Datenschutzerklärung von Berliner Schnauze.'
        },
        {
          name: 'robots',
          content: 'noindex, nofollow'
        }
      ]
    }
  }

}
</script>
