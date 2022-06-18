<template>
  <div class="c-content">
    <main class="c-main o-index">
      <header class="o-index__header">
        <h1 class="o-index__headline">
          Na Keule,<br> keen'n Dunst vom Berlinern?
        </h1>

        <div class="o-index__image-wrap">
          <speedkit-picture
            critical
            v-bind="picture"
            class="o-index__image"
            width="500"
          />
        </div>
      </header>

      <section class="o-index__intro-wrap">
        <div class="o-index__intro-text">
          <p>
            Ok, der Titel dieser Seite flunkert ein wenig.<br>
            Wir Berliner haben streng genommen gar keinen Dialekt, sondern einen Metrolekt, was natürlich viel besser als so ein langweiliger Dialekt ist. Wir sind schließlich die Hauptstadt!
          </p>

          <p>
            Genug rum geprallt, wir können noch viel mehr!<br>
            Wenn man Wikipedia glauben schenken mag, hat unsere Mundart sogar das von den Brandenburgern gesprochene <a href="https://www.wikiwand.com/de/Niederdeutsche_Sprache">Niederdeutsch</a> auf dem Gewissen. Ein Fakt der uns sicher leid tut, uns aber auch stolz macht.
          </p>

          <p>
            Stolz macht uns auch unsere Grammatik. Anders als der Ersteller dieser Seite, der dazu noch keine einzige Info erstellt hat. Was ein Dulli. Na ja, <a href="https://www.wikiwand.com/de/Berlinerische_Grammatik">hier</a> kannst Du dich informieren.
          </p>
          <p>
            So, jetzt aber ran an den Speck!
            Du bist sicher nicht wegen der Einleitung gekommen und willst dir eher die <strong>{{ berlinerWordCount }} Wörter</strong> ins Hirn meißeln.
          </p>

          <p>Da Du bereits soweit gekommen bist, huldige bitte das Wort des Tages. Danke!</p>
        </div>

        <WordOfTheDay critical />
      </section>

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
