<template>
  <footer class="c-footer" style="height: 300px;">
    <!-- <Mailto mail="test@example.com" subject="Optional Example Subject" body="Optional Placeholder Body" title="Write me a email" /> -->

    <div class="c-footer__farewell">
      <div class="c-footer__farewell-image-wrapper">
        <picture>
          <source srcset="~/static/bear-walking.avif" type="image/avif">
          <source srcset="~/static/bear-walking.webp" type="image/webp">
          <source srcset="~/static/bear-walking.png" type="image/png">
          <img src="~/static/bear-walking.png" class="c-footer__farewell-image" alt="Laufender Bär" decoding="async" loading="lazy">
        </picture>
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
  </footer>
</template>

<script>
export default {
  name: 'FooterPart'
}
</script>
