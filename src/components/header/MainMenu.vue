<template>
  <VMenu
    placement="bottom-end"
    :distance="13"
    strategy="fixed"
    container=".c-menu-nav"
    class="c-menu-nav__item c-menu-more"
    :triggers="['click', 'hover', 'touch']"
  >
    <button
      type="button"
      class="c-button c-menu-nav__item-button c-button--center-icon"
      aria-label="Website Menu Navigation"
    >
      <span class="u-icon-wrapper c-button--center-icon">
        <MenuIcon />
      </span>
    </button>

    <template #popper>
      <SocialList list-modifier="c-social-list--mobile-dropdown" :hide-tooltips="true" />
      <NavList
        :items="menuItems"
        classes-ul="c-menu-more__list u-list-reset"
        classes-li="c-menu-more__item"
      />
    </template>
  </VMenu>
</template>

<script setup lang="ts">
import MenuIcon from "virtual:icons/lucide/menu";
import { routeToWord, randomElement } from "@utils/helpers.ts";
import SocialList from "@components/SocialList.vue";
import InstallApp from "@components/InstallApp.vue";
import NavList from "@components/NavList.vue";
import type { DefineComponent } from "vue";

// const randomWord = () => {
//   // TODO: Implement random word
//   // return randomElement(berlinerWords).post_name;
// };
interface ItemObject {
  link: string;
  title: string;
}

const menuItems: (ItemObject | DefineComponent)[] = [
  InstallApp as DefineComponent,
  {
    title: "Wort vorschlagen",
    link: "/wort-vorschlagen",
  },
  {
    title: "Wort Index",
    link: "/wort",
  },
];
</script>

<style scoped></style>
