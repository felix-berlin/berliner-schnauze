<template>
  <header class="c-header">
    <h1>Berliner Schnauze</h1>

    <ScrollToTop>
      <ChevronUp
        :size="32"
        default-class="c-scroll-to-top__icon"
      />
    </ScrollToTop>

    <Dropdown>
      <template #title>
        <span v-show="$colorMode.preference === 'dark'" style="pointer-events: none;">
          <Moon />
        </span>
        <span v-show="$colorMode.preference === 'light'" style="pointer-events: none;">
          <Sun />
        </span>
        <span v-show="$colorMode.preference === 'system'" style="pointer-events: none;">
          <Laptop2 />
        </span>
      </template>
      <template #content>
        <ColorMode />
      </template>
    </Dropdown>

    <Dropdown>
      <template #title>
        <span style="pointer-events: none;">
          <Menu />
        </span>
      </template>
      <template #content>
        <ul>
          <li>
            <NuxtLink to="/imprint">
              Impressum
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/privacy-policy">
              Datenschutz
            </NuxtLink>
          </li>
        </ul>
      </template>
    </Dropdown>
  </header>
</template>

<script>
import { ChevronUp, Moon, Sun, Laptop2, Menu } from 'lucide-vue'
import scrollToTop from './scroll-to-top.vue'
import Dropdown from './dropdown.vue'

export default {
  name: 'HeaderPart',
  components: {
    scrollToTop,
    ChevronUp,
    Moon,
    Sun,
    Laptop2,
    Dropdown,
    Menu
  },

  data () {
    return {
      mode: this.$colorMode.preferencer
    }
  }
}
</script>
