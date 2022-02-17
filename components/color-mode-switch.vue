<template>
  <div class="c-color-mode-switch">
    <input
      id="color-switch"
      v-model="checkedValue"
      type="checkbox"
      name="color-switch"
      class="c-color-mode-switch__toggle c-switch"
      :class="'is-' + $colorMode.value"
    >
  </div>
</template>

<script>
export default {
  name: 'ColorModeSwitch',

  data () {
    return {
      checkedValue: true,
      type: 'input'
    }
  },
  watch: {
    checkedValue () {
      if (this.$colorMode.value === 'light') {
        this.$colorMode.preference = 'dark'
      } else {
        this.$colorMode.preference = 'light'
      }
    }
  }

}
</script>
