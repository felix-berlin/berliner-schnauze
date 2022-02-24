<template>
  <div class="c-content">
    <main class="c-main">
      <header class="c-start-header">
        <h1 class="c-start-header__headline">
          Na Keule,<br> keen'n Dunst vom Berlinern?<br><br> Dann mal uff-jepasst,<br> hier warten <span v-show="getWordLoadingStatus" class="c-loader-text"><span>.</span><span>.</span><span>.</span></span> <span v-show="!getWordLoadingStatus">{{ berlinerWordCount }}</span>  Wörter uff dich!
        </h1>

        <div class="c-start-header__image-wrap">
          <picture>
            <source srcset="~/static/brown-bear-roar.webp" type="image/webp">
            <source srcset="~/static/brown-bear-roar.png" type="image/png">
            <img
              src="~/static/brown-bear-roar.png"
              class="c-start-header__image"
              alt="Brüllender Bär"
              decoding="async"
              loading="eager"
              width="900"
              height="517"
            >
          </picture>
        </div>
      </header>
      <WordList :critical="true" search-aria-label="Wortsuche" />
    </main>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'IndexPage',

  speedkitComponents: {
    WordList: () => import('@/components/word-list')
  },

  // async asyncData ({ store, $sentry }) {
  //   store.commit('wordLoadingStatus', true)

  //   return await this.$axios.get(`${this.$config.baseApiUrl}/wp-json/berliner-schnauze/v1/words`)
  //     .then((res) => {
  //       store.commit('setBerlinWords', res)
  //       store.commit('wordLoadingStatus', false)
  //     }).catch((error) => {
  //       $sentry.captureException(error)
  //     })
  // },

  computed: {
    ...mapGetters(['berlinerWordCount', 'getWordLoadingStatus', 'setBerlinWords', 'wordLoadingStatus'])
  }

}
</script>
