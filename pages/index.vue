<template>
  <div class="c-content">
    <main class="c-main">
      <h1 style="font-size: 4rem;">
        Na Keule, keen'n Dunst vom Berlinern?<br> Dann mal uff-gepasst,<br> hier warten {{ berlinerWordCount }} Wörter auf dich!
      </h1>
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
