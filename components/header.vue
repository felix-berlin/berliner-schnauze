<template>
  <header class="c-header" :class="{'has-searchbar': searchbarVisable}">
    <div class="c-logo">
      <NuxtLink to="/" class="c-logo__link">
        Berliner Schnauze
      </NuxtLink>
    </div>

    <nav class="c-menu-nav">
      <div class="c-menu-nav__main-elements">
        <SearchWords
          v-if="$route.name === 'index'"
          modifier="c-menu-nav__item c-word-search--nav-search"
          button-position="right"
          button-modifier="c-menu-nav__item-button"
          :show-searchbar-after-click="true"
          placeholder="Wortsuche"
          :keyboard-focus="true"
        />

        <Dropdown v-show="!searchbarVisable" modifier="c-menu-nav__item" button-modifier="c-menu-nav__item-button u-button-reset c-button--center-icon" button-aria-label="Ändere den Website Farbmodus" :menu-min-width="false">
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

        <Dropdown v-show="!searchbarVisable" modifier="c-menu-nav__item c-menu-more" button-modifier="c-menu-nav__item-button u-button-reset c-button--center-icon" button-aria-label="Website Menu Navigation">
          <template #title>
            <span class="u-icon-untouchable u-icon-wrapper">
              <Menu />
            </span>
          </template>
          <template #content>
            <SocialList list-modifier="c-social-list--mobile-dropdown" :hide-tooltips="true" />
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

      <SocialList modifier="c-social-list--desktop" list-link-modifier="c-menu-nav__item-link" />
    </nav>
  </header>
</template>

<script>
import { Moon, Sun, Laptop2, Menu } from 'lucide-vue'
import { mapGetters } from 'vuex'
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

  computed: {
    ...mapGetters(['searchbarVisable'])
  }
}
</script>
