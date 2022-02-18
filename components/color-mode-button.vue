<template>
  <button
    class="c-color-mode-button c-button c-button--center-icon"
    type="button"
    :aria-label="ariaLabel"
    @click="changeColorMode"
  >
    <span v-show="$colorMode.value === 'dark'" class="c-button--center-icon">
      <Moon />
    </span>
    <span v-show="$colorMode.value === 'light'" class="c-button--center-icon">
      <Sun />
    </span>
    <span v-show="$colorMode.value === 'system'" class="c-button--center-icon">
      <Laptop2 />
    </span>
  </button>
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
      ariaLabel: 'Ändere den Farbmodus zu ' + (this.$colorMode.value === 'light' ? 'dunkel' : 'hell')
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
