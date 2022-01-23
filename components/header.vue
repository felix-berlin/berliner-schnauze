<template>
  <header class="c-header">
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
