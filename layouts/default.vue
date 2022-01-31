<template>
  <div class="c-body">
    <Header :critical="true" />
    <Nuxt />
    <ScrollToTop button-aria-label="Zurück zum Seitenanfang">
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

  // speedkitComponents: {
  //   Header: () => import('@/components/header'),
  //   ScrollToTop: () => import('@/components/scroll-to-top'),
  //   Footer: () => import('@/components/footer')
  // }

}
</script>
