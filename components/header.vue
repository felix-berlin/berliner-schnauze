<template>
  <header class="c-header">
    <div class="c-logo">
      <NuxtLink to="/" class="c-logo__link">
        Berliner Schnauze
      </NuxtLink>
    </div>

    <nav class="c-menu-nav">
      <div class="c-menu-nav__main-elements">
        <SearchWords
          v-if="$route.name === 'index'"
          modifier="c-menu-nav__item"
          button-position="right"
          button-modifier="c-menu-nav__item-button"
          :show-searchbar-after-click="true"
          placeholder="Durchsuche den Berliner-Wortschatz"
          :keyboard-focus="true"
        />

        <Dropdown modifier="c-menu-nav__item" button-modifier="c-menu-nav__item-button u-button-reset c-button--center-icon" button-aria-label="Ändere den Website Farbmodus">
          <template #title>
            <span v-show="$colorMode.preference === 'dark'" class="u-icon-untouchable u-icon-wrapper">
              <Moon />
            </span>
            <span v-show="$colorMode.preference === 'light'" class="u-icon-untouchable u-icon-wrapper">
              <Sun />
            </span>
            <span v-show="$colorMode.preference === 'system'" class="u-icon-untouchable u-icon-wrapper">
              <Laptop2 />
            </span>
          </template>
          <template #content>
            <ColorMode />
          </template>
        </Dropdown>

        <Dropdown modifier="c-menu-nav__item c-menu-more" button-modifier="c-menu-nav__item-button u-button-reset c-button--center-icon" button-aria-label="Website Menu Navigation">
          <template #title>
            <span class="u-icon-untouchable u-icon-wrapper">
              <Menu />
            </span>
          </template>
          <template #content>
            <ul class="c-menu-more__list u-list-reset">
              <li class="c-menu-more__item">
                <NuxtLink to="/imprint">
                  Impressum
                </NuxtLink>
              </li>
              <li class="c-menu-more__item">
                <NuxtLink to="/privacy-policy">
                  Datenschutz
                </NuxtLink>
              </li>
            </ul>
          </template>
        </Dropdown>
      </div>

      <div class="c-menu-nav__social-links">
        <a
          v-tooltip="'Schau dir das Projekt auf Github an.'"
          rel="noopener"
          class="c-menu-nav__item-link"
          aria-label="Link zum Github Projekt"
          href="https://github.com/felix-berlin/berliner-schnauze"
          target="_blank"
        ><Github /></a>
        <a
          v-tooltip="'Verrückt, Berliner Schnauze gibts auch auf Facebook.'"
          rel="noopener"
          class="c-menu-nav__item-link"
          aria-label="Folge Berliner Schnauze auf Facebook"
          href="https://www.facebook.com/Berliner.Schnauze030"
          target="_blank"
        ><Facebook /></a>
      </div>
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
