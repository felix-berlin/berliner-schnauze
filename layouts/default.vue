<template>
  <div class="c-body">
    <Header />
    <Nuxt />
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
