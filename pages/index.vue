<template>
  <div class="c-content">
    <main class="c-main">
      <header class="c-start-header">
        <h1 class="c-start-header__headline">
          Na Keule, keen'n Dunst vom Berlinern?<br> Dann mal uff-gepasst,<br> hier warten {{ berlinerWordCount }} Wörter auf dich!
        </h1>
        <nuxt-picture preload src="brown-bear-roar.png" fit="inside" class="c-start-header__image" />
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

  computed: {
    ...mapGetters(['berlinerWordCount'])
  }

}
</script>
