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
      <transition name="fast" mode="out-in">
        <span
          v-if="device.isDesktop"
          key="desktop"
          class="u-icon-untouchable u-icon-wrapper c-button--center-icon"
        >
          <MenuIcon />
        </span>
        <!-- <span
                v-if="device.isMobileOrTablet"
                key="mobile"
                class="u-icon-untouchable u-icon-wrapper c-button--center-icon"
              >
                <MoreVertical />
              </span> -->
      </transition>
    </button>

    <template #popper>
      <SocialList list-modifier="c-social-list--mobile-dropdown" :hide-tooltips="true" />
      <ul class="c-menu-more__list u-list-reset">
        <li class="c-menu-more__item">
          <a :href="routeToWord(randomWord())"> Zufälliges Wort </a>
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
import MoreVertical from "virtual:icons/lucide/more-vertical";
import { routeToWord, randomElement } from "@utils/helpers.ts";
import { DeviceDetector } from "@utils/device.ts";
import SocialList from "@components/SocialList.vue";

const randomWord = () => {
  // TODO: Implement random word
  // return randomElement(berlinerWords).post_name;
};

const { device } = new DeviceDetector();

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
</script>

<style scoped></style>
