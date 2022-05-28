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
      <p v-if="$store.state.scrollPositionY > 2000 && $route.name === 'index'" class="c-footer__farewell-text">
        Mensch, ditt war nen weiter Weg.
      </p>
      <p v-else-if="$route.name === 'index'" class="c-footer__farewell-text">
        Knorke ditt du mich hier unten besuchst.
      </p>
      <p v-if="$route.name === 'imprint'" class="c-footer__farewell-text">
        Na, allet klar?
      </p>
      <p v-if="$route.name === 'privacy-policy'" class="c-footer__farewell-text">
        Keine Sorge, so viel weiß ich gar nicht über dich.
      </p>
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
        <!-- <p>Website Version: {{ $config.appVersion }}</p> -->
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
            sizes: { sm: '100vw', md: '100vw', lg: '100vw', xl: '100vw', xxl: '700px' }
          }
        ],
        formats: ['avif', 'webp', 'jpg|jpeg|png'],
        title: 'laufender Bär',
        alt: 'laufender Bär'
      }
    }
  }
}
</script>
