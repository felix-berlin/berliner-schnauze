<template>
  <div
    ref="root"
    data-track-content
    data-content-name="Main Menu"
    data-content-piece="Navigation"
    data-content-target="#"
  >
    <DropdownPopover
      placement="bottom-end"
      :offset="13"
      class="c-menu-nav__item c-menu-more c-dropdown--theme-dropdown"
    >
      <template #default="{ triggerProps }">
        <MainMenuButton v-bind="triggerProps" />
      </template>

      <template #panel>
        <NavList
          :items="menuItems"
          classes-ul="c-menu-more__list u-list-reset"
          classes-li="c-menu-more__item"
        />
      </template>
    </DropdownPopover>
  </div>
</template>

<script setup lang="ts">
import type { DefineComponent } from "vue";

import DropdownPopover from "@components/DropdownPopover.vue";
import InstallApp from "@components/InstallApp.vue";
import MainMenuButton from "@components/MainMenuButton.vue";
import NavList from "@components/NavList.vue";
import { useContentTracking } from "@composables/useContentTracking";
import { ref } from "vue";

const root = ref<HTMLElement | null>(null);
useContentTracking(root);

// const randomWord = () => {
//   // TODO: Implement random word
//   // return randomElement(berlinerWords).post_name;
// };
interface ItemObject {
  link: string;
  title: string;
}

const menuItems: (ItemObject | { component: DefineComponent; props: object })[] = [
  {
    component: InstallApp as DefineComponent,
    props: {
      tooltipProps: {
        placement: "left",
      },
    },
  },
  {
    link: "/games/berliner-oder-nicht",
    title: "Spiel - Berliner oder nicht?",
  },
  {
    link: "/wort-vorschlagen",
    title: "Wort vorschlagen",
  },
  {
    link: "/wort",
    title: "Wort Index",
  },
  {
    link: "/settings",
    title: "Einstellungen",
  },
  {
    link: "/changelog",
    title: "Was ist neu?",
  },
];
</script>
