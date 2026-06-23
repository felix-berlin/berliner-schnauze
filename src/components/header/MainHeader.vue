<template>
  <header class="c-header">
    <div class="c-logo">
      <a href="/" class="c-logo__link"> Berliner Schnauze </a>
    </div>

    <nav class="c-menu-nav">
      <div class="c-menu-nav__main-elements">
        <SearchModal class="c-menu-nav__item" />

        <ColorModeToggle
          class="c-menu-nav__item c-menu-nav__item-button u-button-reset"
        />

        <DropdownPopover
          placement="bottom-end"
          :offset="13"
          class="c-menu-nav__item c-menu-more"
        >
          <span class="u-icon-wrapper c-button--center-icon" aria-label="Website Menu Navigation">
            <MenuIcon />
          </span>

          <template #panel>
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
        </DropdownPopover>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import DropdownPopover from "@components/DropdownPopover.vue";
import ColorModeToggle from "@components/ColorModeToggle.vue";
import SearchModal from "@components/modals/search/SearchModal.vue";
import { randomElement, routeToWord } from "@utils/helpers.ts";
import MenuIcon from "virtual:icons/lucide/menu";

const menuItems = [
  {
    intern: true,
    link: "/suggest-word",
    title: "Wort vorschlagen",
  },
  {
    intern: false,
    link: "https://github.com/felix-berlin/berliner-schnauze/issues/new",
    title: "tech. Fehler melden",
  },
  {
    intern: true,
    link: "/impressum",
    title: "Impressum",
  },
  {
    intern: true,
    link: "/datenschutz",
    title: "Datenschutz",
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
