<template>
  <div class="c-color-mode">
    <ul class="u-list-reset">
      <li v-for="color of colors" v-show="$colorMode.preference !== color" :key="color">
        <a
          :aria-label="'Ändere den Farbmodus zu ' + color"
          :class="getClasses(color)"
          @click="$colorMode.preference = color"
        >
          <span v-show="color === 'dark'">
            <Moon />
          </span>
          <span v-show="color === 'light'">
            <Sun />
          </span>
          <span v-show="color === 'unknown'">
            <Laptop2 />
          </span>
        </a>
      </li>
    </ul>

    <!-- <ColorScheme placeholder="..." tag="span">
      Color mode: <b>{{ $colorMode.preference }}</b>
      <span v-show="$colorMode.preference === 'system'">(<i>{{ $colorMode.value }}</i> mode detected)</span>
    </ColorScheme> -->
  </div>
</template>

<script>
import { Moon, Sun, Laptop2 } from 'lucide-vue'
export default {
  name: 'ColorModeSwitch',

  components: {
    Moon,
    Sun,
    Laptop2
  },

  data () {
    return {
      colors: ['system', 'light', 'dark']
    }
  },

  methods: {
    getClasses (color) {
      // Does not set classes on ssr preference is system (because we know them on client-side)
      if (this.$colorMode.unknown) {
        return {}
      }
      return {
        preferred: color === this.$colorMode.preference,
        selected: color === this.$colorMode.value
      }
    }
  }
}
</script>
