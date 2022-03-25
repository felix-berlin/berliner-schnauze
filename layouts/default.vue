<template>
  <div class="c-body">
    <Header :critical="true" />
    <Nuxt />
    <ScrollToTop button-aria-label="Zurück zum Seitenanfang" tooltip="Zackig nach oben!" :hide-tooltip="$device.isMobileOrTablet">
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
import speedkitHydrate from 'nuxt-speedkit/hydrate'

export default {
  name: 'IndexPage',

  components: {
    ChevronUp,
    Header: speedkitHydrate(() => import('@/components/header')),
    ScrollToTop: speedkitHydrate(() => import('@/components/scroll-to-top')),
    Footer: speedkitHydrate(() => import('@/components/footer'))
  }
}
</script>
