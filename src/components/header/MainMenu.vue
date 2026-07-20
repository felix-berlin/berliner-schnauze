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
          :items="items"
          classes-ul="c-menu-more__list u-list-reset"
          :classes-li="itemClasses"
        />
      </template>
    </DropdownPopover>
  </div>
</template>

<script setup lang="ts">
import type { MenuItem } from "@services/queries/getMenu";
import type { DefineComponent } from "vue";

import DropdownPopover from "@components/DropdownPopover.vue";
import InstallApp from "@components/InstallApp.vue";
import MainMenuButton from "@components/MainMenuButton.vue";
import NavList from "@components/NavList.vue";
import { useContentTracking } from "@composables/useContentTracking";
import { computed, ref } from "vue";

interface MainMenuProps {
  menuItems?: MenuItem[];
}

const { menuItems = [] } = defineProps<MainMenuProps>();

const root = ref<HTMLElement | null>(null);
useContentTracking(root);

// The install prompt is a fixed, non-CMS entry; everything after it comes
// from the WordPress "Main Menu" location (see @services/queries/getMenu).
const installAppItem = {
  component: InstallApp as DefineComponent,
  props: {
    tooltipProps: {
      placement: "left",
    },
  },
};

const items = computed(() => [installAppItem, ...menuItems]);

// Dashed divider between the fixed install item and the CMS-driven links —
// only when there's something to separate it from.
const itemClasses = (_item: unknown, index: number): string =>
  index === 1 ? "c-menu-more__item is-split" : "c-menu-more__item";
</script>
