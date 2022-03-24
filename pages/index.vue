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
      <SearchWords :critical="true" searchbar-type="large" :focus-on-page-load="true" placeholder="Durchsuche den Berliner-Wortschatz" />

      <LetterFilter :critical="true" modifier="c-letter-filter--desktop" />

      <div class="c-filter-dropdown">
        <Dropdown :critical="true" menu-align="right" :modifier="['c-filter-dropdown__dropdown']" :button-modifier="[{'has-active-filter': getLetterFilter}, 'c-button--center-icon']">
          <template #title>
            <span class="u-icon-untouchable c-button--center-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            </span>
            Filter
          </template>
          <template #content>
            <LetterFilter :critical="true" modifier="c-letter-filter--mobile" />
          </template>
        </Dropdown>
        <div v-if="getLetterFilter" class="c-filter-dropdown__active-filter" @click="clearFilter(null)">
          <span>{{ getLetterFilter }}</span><span><X :size="10" /></span>
        </div>
      </div>

      <WordList :critical="true" />
    </main>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import speedkitHydrate from 'nuxt-speedkit/hydrate'
import { X } from 'lucide-vue'

export default {
  name: 'IndexPage',

  components: {
    WordList: speedkitHydrate(() => import('@/components/word-list')),
    SearchWords: speedkitHydrate(() => import('@/components/search-words')),
    LetterFilter: speedkitHydrate(() => import('@/components/letter-filter')),
    Dropdown: speedkitHydrate(() => import('@/components/dropdown')),
    X
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
    ...mapGetters(['berlinerWordCount', 'getWordLoadingStatus', 'getLetterFilter'])
  },

  methods: {
    clearFilter (letter) {
      this.$store.commit('updateWordFilteredLetter', letter)
    }
  }

}
</script>
