<template>
  <footer class="c-footer">
    <div class="c-footer__farewell">
      <div class="c-footer__farewell-image-wrapper">
        <speedkit-picture
          v-bind="picture"
          class="c-footer__farewell-image"
          width="700"
          height="451"
        />
      </div>
      <p class="c-footer__farewell-text" v-text="farewellText()" />
    </div>

    <div class="c-footer__ground">
      <p class="c-footer__slogan">
        Hergestellt mit🐻-Kräften in Berlin
      </p>

      <nav class="c-footer__nav">
        <NuxtLink to="/imprint">
          Impressum
        </NuxtLink>
        <NuxtLink to="/privacy-policy">
          Datenschutz
        </NuxtLink>
      </nav>
    </div>
    <div class="c-footer__end">
      <div class="c-footer__end-content">
        <a href="https://github.com/felix-berlin/berliner-schnauze/releases">Website Version: {{ $config.appVersion }}</a>
        <p>Ein Projekt von: <a href="https://webshaped.de">Webshaped / Felix Scholze</a></p>
      </div>
    </div>
  </footer>
</template>

<script>
import SpeedkitPicture from 'nuxt-speedkit/components/SpeedkitPicture'

export default {
  name: 'FooterPart',

  components: {
    SpeedkitPicture
  },
  data () {
    return {
      picture: {
        sources: [
          {
            src: '/bear-walking.png',
            sizes: { xs: '160px', sm: '100vw', md: '100vw', lg: '100vw', xl: '100vw', xxl: '700px' }
          }
        ],
        formats: ['avif', 'webp', 'jpg|jpeg|png'],
        title: 'laufender Bär',
        alt: 'laufender Bär'
      }
    }
  },

  methods: {
    farewellText () {
      if (this.$store.state.scrollPositionY > 2000 && this.$route.name === 'index') {
        return 'Mensch, ditt war nen weiter Weg.'
      } else if (this.$route.name === 'index') {
        return 'Knorke ditt du mich hier unten besuchst.'
      } else if (this.$route.name === 'imprint') {
        return 'Na, allet klar?'
      } else if (this.$route.name === 'privacy-policy') {
        return 'Keine Sorge, so viel weiß ich gar nicht über dich.'
      }
    }
  }
}
</script>
