<template>
  <VMenu
    placement="bottom-end"
    :distance="13"
    strategy="fixed"
    container=".c-menu-nav"
    class="c-menu-nav__item c-menu-more"
    :triggers="['click', 'hover', 'touch']"
  >
    <MainMenuButton />

    <template #popper>
      <NavList
        :items="menuItems"
        classes-ul="c-menu-more__list u-list-reset"
        classes-li="c-menu-more__item"
      />
    </template>
  </VMenu>
</template>

<script setup lang="ts">
import InstallApp from "@components/InstallApp.vue";
import NavList from "@components/NavList.vue";
import type { DefineComponent } from "vue";
import MainMenuButton from "@components/MainMenuButton.vue";

// const randomWord = () => {
//   // TODO: Implement random word
//   // return randomElement(berlinerWords).post_name;
// };
interface ItemObject {
  link: string;
  title: string;
}

const menuItems: (ItemObject | DefineComponent)[] = [
  {
    component: InstallApp as DefineComponent,
    props: {
      tooltipProps: {
        placement: "left",
        container: ".c-menu-nav",
      },
    },
  },
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
