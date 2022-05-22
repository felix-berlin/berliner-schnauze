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
          searchbar-type="nav-search"
          :modifier="[{'c-word-search--full-width': searchbarVisable}, 'c-menu-nav__item']"
          button-position="right"
          button-modifier="c-menu-nav__item-button"
          :show-searchbar-after-click="true"
          placeholder="Wortsuche"
          :keyboard-focus="true"
        />

        <ColorModeButton class="c-menu-nav__item c-menu-nav__item-button u-button-reset" :class="{'is-hidden': searchbarVisable}" />

        <VMenu placement="bottom-end">
          <button type="button" class="c-dropdown__button c-button" aria-label="hier">
            <span v-show="$device.isDesktop" class="u-icon-untouchable u-icon-wrapper">
              <Menu />
            </span>
            <span v-show="$device.isMobileOrTablet" class="u-icon-untouchable u-icon-wrapper">
              <MoreVertical />
            </span>
          </button>

          <template #popper>
            <SocialList list-modifier="c-social-list--mobile-dropdown" :hide-tooltips="true" />
            <ul class="c-menu-more__list u-list-reset">
              <li v-for="(item, index) in menuItems" :key="index" class="c-menu-more__item">
                <NuxtLink :to="item.link">
                  {{ item.title }}
                </NuxtLink>
              </li>
            </ul>
          </template>
        </VMenu>

        <Dropdown
          :modifier="[{'is-hidden': searchbarVisable}, 'c-menu-nav__item c-menu-more']"
          button-modifier="c-menu-nav__item-button u-button-reset c-button--center-icon"
          button-aria-label="Website Menu Navigation"
        >
          <template #title>
            <span v-show="$device.isDesktop" class="u-icon-untouchable u-icon-wrapper">
              <Menu />
            </span>
            <span v-show="$device.isMobileOrTablet" class="u-icon-untouchable u-icon-wrapper">
              <MoreVertical />
            </span>
          </template>
          <template #content>
            <SocialList list-modifier="c-social-list--mobile-dropdown" :hide-tooltips="true" />
            <ul class="c-menu-more__list u-list-reset">
              <li v-for="(item, index) in menuItems" :key="index" class="c-menu-more__item">
                <NuxtLink :to="item.link">
                  {{ item.title }}
                </NuxtLink>
              </li>
            </ul>
          </template>
        </Dropdown>
      </div>

      <SocialList modifier="c-social-list--desktop" list-link-modifier="c-menu-nav__item-link" list-modifier="u-list-vertical" />
    </nav>
  </header>
</template>

<script>
import { Menu, MoreVertical } from 'lucide-vue'
import { mapGetters } from 'vuex'
import Dropdown from './dropdown.vue'

export default {
  name: 'HeaderPart',

  components: {
    Dropdown,
    Menu,
    MoreVertical
  },

  data () {
    return {
      menuItems: [
        {
          title: 'Wort vorschlagen',
          link: '/suggest-word'
        },
        {
          title: 'Impressum',
          link: '/imprint'
        },
        {
          title: 'Datenschutz',
          link: '/privacy-policy'
        }
      ]
    }
  },

  computed: {
    ...mapGetters(['searchbarVisable'])
  }

}
</script>
