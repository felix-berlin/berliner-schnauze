<template>
  <header class="c-header" :class="{'has-searchbar': searchbarVisible}">
    <div class="c-logo">
      <NuxtLink to="/" class="c-logo__link">
        Berliner Schnauze
      </NuxtLink>
    </div>

    <nav class="c-menu-nav">
      <div class="c-menu-nav__main-elements">
        <SearchWords
          v-if="$route.name === 'index'"
          id="header"
          searchbar-type="nav-search"
          :modifier="[{'c-word-search--full-width': searchbarVisible}, 'c-menu-nav__item']"
          button-position="right"
          button-modifier="c-menu-nav__item-button"
          :show-searchbar-after-click="true"
          placeholder="Wortsuche"
          :keyboard-focus="true"
        />

        <ColorModeButton class="c-menu-nav__item c-menu-nav__item-button u-button-reset" :class="{'is-hidden': searchbarVisible}" />

        <VMenu placement="bottom-end" :distance="13" strategy="fixed" container=".c-menu-nav" class="c-menu-nav__item c-menu-more">
          <button type="button" class="c-button c-menu-nav__item-button u-button-reset c-button--center-icon" aria-label="Website Menu Navigation">
            <span v-if="$device.isDesktop" class="u-icon-untouchable u-icon-wrapper c-button--center-icon">
              <Menu />
            </span>
            <span v-if="$device.isMobileOrTablet" class="u-icon-untouchable u-icon-wrapper c-button--center-icon">
              <MoreVertical />
            </span>
          </button>

          <template #popper>
            <SocialList list-modifier="c-social-list--mobile-dropdown" :hide-tooltips="true" />
            <ul class="c-menu-more__list u-list-reset">
              <li class="c-menu-more__item">
                <NuxtLink :to="$routeToWord(randomWord())">
                  Zufälliges Wort
                </NuxtLink>
              </li>
              <li v-for="(item, index) in menuItems" :key="index" class="c-menu-more__item" :class="{ 'is-split': item.title === 'Impressum' }">
                <NuxtLink :to="item.link">
                  {{ item.title }}
                </NuxtLink>
              </li>
            </ul>
          </template>
        </VMenu>
      </div>

      <SocialList modifier="c-social-list--desktop" list-link-modifier="c-menu-nav__item-link" list-modifier="u-list-vertical" />
    </nav>
  </header>
</template>

<script>
import { Menu, MoreVertical } from 'lucide-vue'
import { mapGetters } from 'vuex'

export default {
  name: 'HeaderPart',

  components: {
    // eslint-disable-next-line
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
    ...mapGetters(['searchbarVisible', 'berlinerWords'])
  },

  methods: {
    randomWord () {
      return this.$randomElement(this.berlinerWords).post_name
    }
  }

}
</script>
