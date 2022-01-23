<template>
  <header class="c-header">
    <h1>Berliner Schnauze</h1>
    <ColorMode />
    <ScrollToTop>Nach oben</ScrollToTop>
  </header>
</template>

<script>
import scrollToTop from './scroll-to-top.vue'
export default {
  name: 'HeaderPart',
  components: { scrollToTop }
}
</script>
