<template>
  <footer class="c-footer">
    <div class="c-footer__farewell">
      <div class="c-footer__farewell-image-wrapper">
        <nuxt-picture
          src="/bear-walking.png"
          format="webp"
          width="700"
          height="451"
          alt="laufender Bär"
          :img-attrs="{ class: 'c-footer__farewell-image', title: 'laufender Bär' }"
        />
      </div>
      <!-- <p class="c-footer__farewell-text" v-text="farewellText()" /> -->
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
        <a href="https://github.com/felix-berlin/berliner-schnauze/releases">Website Version: {{ version }}</a>
        <p>Ein Projekt von: <a href="https://webshaped.de">Webshaped / Felix Scholze</a></p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { version } from './../package.json'

const route = useRoute()

// const farewellText = () => {
//   if (this.$store.state.scrollPositionY > 2000 && route.name === 'index') {
//     return 'Mensch, ditt war nen weiter Weg.'
//   } else if (route.name === 'index') {
//     return 'Knorke ditt du mich hier unten besuchst.'
//   } else if (route.name === 'imprint') {
//     return 'Na, allet klar?'
//   } else if (route.name === 'privacy-policy') {
//     return 'Keine Sorge, so viel weiß ich gar nicht über dich.'
//   }
// }

</script>

<style scoped>

</style>
