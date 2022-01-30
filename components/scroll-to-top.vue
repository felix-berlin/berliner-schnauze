<template>
  <div class="c-scroll-to-top">
    <transition name="fade">
      <button v-show="windowTop >= showAtPosition" type="button" class="c-scroll-to-top__button" @click="scrollToTop">
        <slot>Scroll to top</slot>
      </button>
    </transition>
  </div>
</template>

<script>
export default {
  name: 'ScrollToTop',

  props: {
    showAtPosition: {
      type: Number,
      default: 500
    }
  },

  data () {
    return {
      windowTop: 0
    }
  },

  mounted () {
    window.addEventListener('scroll', this.onScroll, { passive: true })
  },

  beforeDestroy () {
    window.removeEventListener('scroll', this.onScroll, { passive: true })
  },

  methods: {
    onScroll (scroll) {
      this.windowTop = scroll.target.documentElement.scrollTop
    },

    scrollToTop () {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
}
</script>
