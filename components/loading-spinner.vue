<template>
  <transition name="fade">
    <div v-show="show" class="c-loader">
      <i class="c-loader__spinner c-loader__spinner--5" />
    </div>
  </transition>
</template>

<script>
export default {
  name: 'LoadingSpinner',

  props: {
    show: {
      type: Boolean,
      default: false
    }
  },

  data () {
    return {

    }
  },

  mounted () {

  },

  beforeDestroy () {

  },

  methods: {

  }
}
</script>
