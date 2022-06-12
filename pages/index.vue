<template>
  <div class="c-content">
    <main class="c-main">
      <header class="c-start-header">
        <h1 class="c-start-header__headline">
          Na Keule,<br> keen'n Dunst vom Berlinern?<br><br> Dann mal uff-jepasst,<br> hier warten <span
            v-show="getWordLoadingStatus"
            class="c-loader-text"
          ><span>.</span><span>.</span><span>.</span></span> <span
            v-show="!getWordLoadingStatus"
            v-text="berlinerWordCount"
          /> Wörter uff dich!
        </h1>

        <WordOfTheDay critical />

        <div class="c-start-header__image-wrap">
          <speedkit-picture
            critical
            v-bind="picture"
            class="c-start-header__image"
            width="900"
            height="517"
          />
        </div>
      </header>

      <SearchWords
        critical
        searchbar-type="large"
        :focus-on-page-load="true"
        placeholder="Durchsuche den Berliner-Wortschatz"
      />

      <LetterFilter critical class="c-letter-filter--desktop" />

      <FilterDropdown />

      <WordList critical />
    </main>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import speedkitHydrate from 'nuxt-speedkit/hydrate'
import SpeedkitPicture from 'nuxt-speedkit/components/SpeedkitPicture'

export default {
  name: 'IndexPage',

  components: {
    WordList: speedkitHydrate(() => import('@/components/word-list')),
    SearchWords: speedkitHydrate(() => import('@/components/search-words')),
    LetterFilter: speedkitHydrate(() => import('@/components/letter-filter')),
    FilterDropdown: speedkitHydrate(() => import('@/components/filter-dropdown')),
    WordOfTheDay: speedkitHydrate(() => import('@/components/word-of-the-day')),
    SpeedkitPicture
  },
  data () {
    return {
      picture: {
        sources: [
          {
            src: '/brown-bear-roar.png',
            sizes: { sm: '100vw', md: '40vw', lg: '40vw', xl: '50vw', xxl: '900px' }
          }
        ],
        formats: ['avif', 'webp', 'jpg|jpeg|png'],
        title: 'brüllender Bär',
        alt: 'brüllender Bär'
      }
    }
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
    ...mapGetters(['berlinerWordCount', 'getWordLoadingStatus'])
  }

}
</script>
