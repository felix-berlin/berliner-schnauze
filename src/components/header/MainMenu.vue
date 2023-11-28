<template>
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
        <li>
          <InstallApp></InstallApp>
        </li>
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
</template>

<script setup lang="ts">
import MenuIcon from "virtual:icons/lucide/menu";
import { routeToWord, randomElement } from "@utils/helpers.ts";
import SocialList from "@components/SocialList.vue";
import InstallApp from "@components/InstallApp.vue";

// const randomWord = () => {
//   // TODO: Implement random word
//   // return randomElement(berlinerWords).post_name;
// };

const menuItems = [
  {
    title: "Wort vorschlagen",
    link: "/wort-vorschlagen",
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
</script>

<style scoped></style>
