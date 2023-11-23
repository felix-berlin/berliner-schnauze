<template>
  <header class="c-header">
    <div class="c-logo">
      <a href="/" class="c-logo__link"> Berliner Schnauze </a>
    </div>

    <nav class="c-menu-nav">
      <div class="c-menu-nav__main-elements">
        <SearchModal class="c-menu-nav__item" />

        <ColorModeToggle class="c-menu-nav__item c-menu-nav__item-button u-button-reset" />

        <VMenu
          placement="bottom-end"
          :distance="13"
          strategy="fixed"
          container=".c-menu-nav"
          class="c-menu-nav__item c-menu-more"
        >
          <button
            type="button"
            class="c-button c-menu-nav__item-button u-button-reset c-button--center-icon"
            aria-label="Website Menu Navigation"
          >
            <span class="u-icon-untouchable u-icon-wrapper c-button--center-icon">
              <MenuIcon />
            </span>
          </button>

          <template #popper>
            <SocialList list-modifier="c-social-list--mobile-dropdown" :hide-tooltips="true" />
            <ul class="c-menu-more__list u-list-reset">
              <!-- <li class="c-menu-more__item">
                <a :href="routeToWord(randomWord())"> Zufälliges Wort </a>
              </li> -->
              <li
                v-for="(item, index) in menuItems"
                :key="index"
                class="c-menu-more__item"
                :class="{ 'is-split': item.title === 'Impressum' }"
              >
                <a v-if="item.intern" :href="item.link">
                  {{ item.title }}
                </a>
                <a v-else :href="item.link" target="_blank" v-text="item.title" />
              </li>
            </ul>
          </template>
        </VMenu>
      </div>

      <SocialList
        modifier="c-social-list--desktop"
        list-link-modifier="c-menu-nav__item-link"
        list-modifier="u-list-vertical"
      />
    </nav>
  </header>
</template>

<script setup lang="ts">
import MenuIcon from "virtual:icons/lucide/menu";
import { routeToWord, randomElement } from "@utils/helpers.ts";
import ColorModeToggle from "@components/ColorModeToggle.vue";
import SearchModal from "@components/SearchModal.vue";
import SocialList from "@components/SocialList.vue";

const menuItems = [
  {
    title: "Wort vorschlagen",
    link: "/suggest-word",
    intern: true,
  },
  {
    title: "tech. Fehler melden",
    link: "https://github.com/felix-berlin/berliner-schnauze/issues/new",
    intern: false,
  },
  {
    title: "Impressum",
    link: "/impressum",
    intern: true,
  },
  {
    title: "Datenschutz",
    link: "/datenschutz",
    intern: true,
  },
];

const randomWord = () => {
  // TODO: Implement random word
  // return randomElement(berlinerWords).post_name;
};
</script>

<style lang="scss">
@use "@styles/components/menu-nav";
</style>
