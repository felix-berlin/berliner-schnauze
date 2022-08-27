<template>
  <main class="c-content o-legal-pages">
    <div v-if="imprint.status === 'publish'" v-html="imprint.content.rendered" />
  </main>
</template>

<script>
export default {
  name: 'ImprintPage',

  async asyncData ({ $axios, $config, $sentry }) {
    const imprint = await $axios.$get(`${$config.baseApiUrl}/wp-json/wp/v2/pages/4712`)
      .catch((error) => {
        $sentry.captureException(error)
      })

    return { imprint }
  },

  head () {
    return {
      title: 'Impressum - Berliner Schnauze',
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: 'Das Impressum von Berliner Schnauze.'
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

<style lang="scss">
  @use '@styles/objects/legal-pages';
</style>
