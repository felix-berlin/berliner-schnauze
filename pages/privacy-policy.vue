<template>
  <main class="c-content o-legal-pages">
    <div v-if="privacyPolicy.status === 'publish'" v-html="privacyPolicy.content.rendered" />
  </main>
</template>

<script>
export default {
  name: 'PrivacyPolicyPage',

  async asyncData ({ $axios, $config, $sentry }) {
    const privacyPolicy = await $axios.$get(`${$config.baseApiUrl}/wp-json/wp/v2/pages/4715`)
      .catch((error) => {
        $sentry.captureException(error)
      })

    return { privacyPolicy }
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
