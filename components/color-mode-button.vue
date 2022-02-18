<template>
  <component :is="type" class="c-color-mode-button c-button c-button--center-icon" type="button" @click="changeColorMode">
    <span v-if="$colorMode.value === 'dark'" class="c-button--center-icon">
      <Moon />
    </span>
    <span v-if="$colorMode.value === 'light'" class="c-button--center-icon">
      <Sun />
    </span>
    <span v-if="$colorMode.value === 'system'" class="c-button--center-icon">
      <Laptop2 />
    </span>
  </component>
</template>

<script>
import { Moon, Sun, Laptop2 } from 'lucide-vue'
export default {
  name: 'ColorModeButton',

  components: {
    Moon,
    Sun,
    Laptop2
  },

  data () {
    return {
      type: 'button'
    }
  },

  methods: {
    changeColorMode () {
      if (this.$colorMode.value === 'light') {
        this.$colorMode.preference = 'dark'
      } else {
        this.$colorMode.preference = 'light'
      }
    }
  }
}
</script>
