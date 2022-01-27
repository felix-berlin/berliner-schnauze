<template>
  <footer class="c-footer" style="height: 300px;">
    <p>Mensch ditt war nen weiter Weg</p>
    <Mailto mail="test@example.com" subject="Optional Example Subject" body="Optional Placeholder Body" title="Write me a email" />

    <NuxtLink to="/imprint">
      Impressum
    </NuxtLink>
    <NuxtLink to="/privacy-policy">
      Datenschutz
    </NuxtLink>
  </footer>
</template>

<script>
export default {
  name: 'FooterPart'
}
</script>
