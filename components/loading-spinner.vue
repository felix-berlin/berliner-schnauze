<template>
  <div v-if="show" class="c-loader">
    <i class="c-loader__spinner c-loader__spinner--5" />
  </div>
</template>

<script>
export default {
  name: 'LoadingSpinner',

  props: {
    show: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style lang="scss">
  @use '@styles/components/loading-spinner';
</style>
