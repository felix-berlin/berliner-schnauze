<template>
  <header class="c-header">
    <h1 class="c-logo">
      <NuxtLink to="/">
        Berliner Schnauze
      </NuxtLink>
    </h1>

    <nav class="c-menu-nav">
      <SearchWords v-if="$route.name === 'index'" placeholder="Durchsuche den Berliner-Wortschatz" />
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

      <!-- <button type="button" @click="focusSearch">
        <Search />
      </button> -->
    </nav>
  </header>
</template>

<script>
import { Moon, Sun, Laptop2, Menu } from 'lucide-vue'
import Dropdown from './dropdown.vue'

export default {
  name: 'HeaderPart',
  components: {
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
  },

  methodes: {

  }
}
</script>
