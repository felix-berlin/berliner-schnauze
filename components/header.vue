<template>
  <header class="c-header">
    <div class="c-logo">
      <NuxtLink to="/">
        Berliner Schnauze
      </NuxtLink>
    </div>

    <nav class="c-menu-nav">
      <SearchWords v-if="$route.name === 'index'" button-position="right" :show-searchbar-after-click="true" placeholder="Durchsuche den Berliner-Wortschatz" :keyboard-focus="true" />

      <Dropdown button-aria-label="Ändere den Website Farbmodus">
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

      <a rel="noopener" aria-label="Link zum Github Projekt" href="https://github.com/felix-berlin/berliner-schnauze" target="_blank"><Github /></a>
      <a rel="noopener" aria-label="Folge Berliner Schnauze auf Facebook" href="https://www.facebook.com/Berliner.Schnauze030" target="_blank"><Facebook /></a>

      <Dropdown button-aria-label="Website Menu Navigation">
        <template #title>
          <span style="pointer-events: none;">
            <Menu />
          </span>
        </template>
        <template #content>
          <ul class="u-list-reset">
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
    </nav>
  </header>
</template>

<script>
import { Moon, Sun, Laptop2, Menu, Github, Facebook } from 'lucide-vue'
import Dropdown from './dropdown.vue'

export default {
  name: 'HeaderPart',
  components: {
    Moon,
    Sun,
    Laptop2,
    Dropdown,
    Menu,
    Github,
    Facebook
  }
}
</script>
