<template>
  <div class="c-body">
    <HeaderPart :critical="true" />
    <Nuxt />
    <ScrollToTop button-aria-label="Zurück zum Seitenanfang" tooltip="Zackig nach oben!" :hide-tooltip="$device.isMobileOrTablet">
      <ChevronUp
        :size="32"
        default-class="c-scroll-to-top__icon"
      />
    </ScrollToTop>
    <CookieConsent>
      <template slot="content">
        <Cookie />
      </template>
      <template slot="reject-button">
        Nope
      </template>
      <template slot="accept-button">
        Yes
      </template>
    </CookieConsent>
    <FooterPart />
  </div>
</template>

<script>
import { ChevronUp, Cookie } from 'lucide-vue'
import speedkitHydrate from 'nuxt-speedkit/hydrate'

export default {
  name: 'IndexPage',

  components: {
    ChevronUp,
    Cookie,
    HeaderPart: speedkitHydrate(() => import('@/components/header')),
    ScrollToTop: speedkitHydrate(() => import('@/components/scroll-to-top')),
    FooterPart: speedkitHydrate(() => import('@/components/footer')),
    CookieConsent: speedkitHydrate(() => import('@/components/cookie-consent'))
  }
}
</script>
