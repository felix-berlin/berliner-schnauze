<template>
  <button
    class="c-color-mode-button c-button c-button--center-icon"
    type="button"
    :aria-label="ariaLabel"
    @click="changeColorMode"
  >
    <transition name="fade-fast" mode="out-in">
      <span v-if="$colorMode.value === 'dark'" key="dark" class="c-button--center-icon">
        <Moon />
      </span>
      <span v-if="$colorMode.value === 'light'" key="light" class="c-button--center-icon">
        <Sun />
      </span>
      <span v-if="$colorMode.value === 'system'" key="system" class="c-button--center-icon">
        <Laptop2 />
      </span>
    </transition>
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
