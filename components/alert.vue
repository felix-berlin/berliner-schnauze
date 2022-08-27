<template>
  <component
    :is="element"
    :class="[componentClass, componentClass + '--' + type]"
    role="alert"
  >
    <slot>
      Alert
    </slot>
  </component>
</template>

<script>
export default {
  name: 'AlertBanner',

  props: {
    element: {
      type: String,
      default: 'div'
    },
    type: {
      type: String,
      default: 'warning',
      validator (value) {
        return ['success', 'danger', 'warning', 'info'].includes(value)
      }
    },
    componentClass: {
      type: String,
      default: 'c-alert'
    }
  }
}

</script>

<style lang="scss">
  @use '@styles/components/alert';
</style>
