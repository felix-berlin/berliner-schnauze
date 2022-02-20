<template>
  <div class="c-scroll-to-top" :class="{'is-close-to-end': scrollCloseToEnd}">
    <transition name="fade">
      <button
        v-show="$store.state.scrollPositionY >= showAtPosition"
        v-tooltip="{
          content: tooltip,
          disabled: (tooltip.length ? false : true) || hideTooltip,
          theme: 'berliner-schnauze',
          placement: 'auto'
        }"
        :aria-label="buttonAriaLabel"
        type="button"
        class="c-scroll-to-top__button c-button c-button--center-icon c-button--dashed-border "
        @click="scrollToTop"
      >
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
    },
    buttonAriaLabel: {
      type: String,
      default: ''
    },
    tooltip: {
      default: '',
      type: String
    },
    hideTooltip: {
      type: Boolean,
      default: false
    }
  },

  data () {
    return {
      scrollCloseToEnd: false
    }
  },

  mounted () {
    window.addEventListener('scroll', this.onScroll, { passive: true })
  },

  beforeDestroy () {
    window.removeEventListener('scroll', this.onScroll, { passive: true })
  },

  methods: {
    onScroll () {
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 300) {
        this.scrollCloseToEnd = true
      } else {
        this.scrollCloseToEnd = false
      }

      this.$store.commit('updateScrollPositionY', window.scrollY)
    },

    scrollToTop () {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
}
</script>
