<template>
  <div class="c-body">
    <Header />
    <Sidebar />
    <main class="c-main">
      <h2 style="font-size: 4rem;">
        Na Keule, keen'n Dunst vom Berlinern?<br> Dann mal uff-gepasst!
      </h2>
      <WordList />
    </main>
    <ScrollToTop>
      <ChevronUp
        :size="32"
        default-class="c-scroll-to-top__icon"
      />
    </ScrollToTop>
    <Footer />
  </div>
</template>

<script>
import { ChevronUp } from 'lucide-vue'
export default {
  name: 'IndexPage',

  components: {
    ChevronUp
  }

}
</script>
