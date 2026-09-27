<template>
  <div
    ref="root"
    data-track-content
    data-content-name="Main Menu"
    data-content-piece="Navigation"
    data-content-target="#"
  >
    <DropdownPopover name="main-menu" placement="bottom-end" :offset="13" class="c-main-menu">
      <template #default="{ triggerProps, isOpen }">
        <MainMenuButton v-bind="triggerProps" :is-open="isOpen" />
      </template>

      <template #panel>
        <nav class="c-main-menu__nav" aria-label="Hauptmenü">
          <div class="c-main-menu__columns">
            <div v-if="discoverItems.length" class="c-main-menu__col c-main-menu__col--discover">
              <p class="c-main-menu__label">Entdecken</p>
              <a
                v-for="item in discoverItems"
                :key="item.link"
                class="c-main-menu__card"
                :href="item.link"
                :rel="item.rel"
              >
                <span class="c-main-menu__tile">
                  <component :is="ICONS[item.link]" v-if="ICONS[item.link]" aria-hidden="true" />
                </span>
                <span class="c-main-menu__text">
                  <span class="c-main-menu__title">
                    {{ item.title }}
                    <span v-if="NEW_PATHS.has(item.link)" class="c-main-menu__tag">Neu</span>
                  </span>
                  <span class="c-main-menu__desc">{{ item.description }}</span>
                </span>
              </a>
            </div>

            <div class="c-main-menu__col">
              <template v-for="group in linkGroups" :key="group.label">
                <p v-if="group.items.length" class="c-main-menu__label">{{ group.label }}</p>
                <a
                  v-for="item in group.items"
                  :key="item.link"
                  class="c-main-menu__link"
                  :href="item.link"
                  :rel="item.rel"
                >
                  <component :is="ICONS[item.link]" v-if="ICONS[item.link]" aria-hidden="true" />
                  {{ item.title }}
                </a>
              </template>

              <fieldset class="c-main-menu__modes">
                <legend class="u-sr-only">Farbschema</legend>
                <label v-for="m in MODES" :key="m.value" class="c-main-menu__mode" :title="m.label">
                  <input
                    v-model="mode"
                    class="u-sr-only"
                    type="radio"
                    name="color-mode"
                    :value="m.value"
                    :aria-label="m.label"
                  />
                  <component :is="m.icon" aria-hidden="true" />
                </label>
              </fieldset>
            </div>
          </div>

          <div v-if="!isPwaInstalled" class="c-main-menu__install">
            <span class="c-main-menu__install-text">
              Mit der App bleibst Du immer informiert, ob online oder offline.
            </span>
            <InstallApp class="c-button--primary c-main-menu__install-button">
              <DownloadIcon aria-hidden="true" /> App installieren
            </InstallApp>
          </div>
        </nav>
      </template>
    </DropdownPopover>
  </div>
</template>

<script setup lang="ts">
import type { MenuItem } from "@services/queries/getMenu";
import type { Component } from "vue";

import DropdownPopover from "@components/DropdownPopover.vue";
import InstallApp from "@components/InstallApp.vue";
import MainMenuButton from "@components/MainMenuButton.vue";
import { useContentTracking } from "@composables/useContentTracking";
import { useStore } from "@nanostores/vue";
import { $isDarkMode, setDarkMode } from "@stores/darkMode.ts";
import { $isPwaInstalled } from "@stores/installApp.ts";
import { trackEvent } from "@utils/analytics";
import { computed, defineAsyncComponent, ref } from "vue";

interface MainMenuProps {
  menuItems?: MenuItem[];
}

const { menuItems = [] } = defineProps<MainMenuProps>();

const root = ref<HTMLElement | null>(null);
useContentTracking(root);

// ponytail: the WP "Main Menu" is flat and only carries label/path/description, so
// icons, the "App" group and the "Neu" tag are keyed by path here. Move to WP menu
// CSS classes once editors need to change them without a deploy.
const ICONS: Record<string, Component> = {
  "/anki": defineAsyncComponent(() => import("virtual:icons/lucide/layers")),
  "/changelog": defineAsyncComponent(() => import("virtual:icons/lucide/sparkles")),
  "/games/berliner-oder-nicht": defineAsyncComponent(
    () => import("virtual:icons/lucide/gamepad-2"),
  ),
  "/magazin": defineAsyncComponent(() => import("virtual:icons/lucide/newspaper")),
  "/settings": defineAsyncComponent(() => import("virtual:icons/lucide/settings")),
  "/spenden": defineAsyncComponent(() => import("virtual:icons/lucide/heart")),
  "/wort": defineAsyncComponent(() => import("virtual:icons/lucide/book-a")),
  "/wort-vorschlagen": defineAsyncComponent(
    () => import("virtual:icons/lucide/message-square-plus"),
  ),
};
const APP_PATHS = new Set(["/changelog", "/settings"]);
const NEW_PATHS = new Set(["/anki"]);

const DownloadIcon = defineAsyncComponent(() => import("virtual:icons/lucide/download"));

// Items with a WP description are the big "Entdecken" cards; the rest are compact links.
const discoverItems = computed(() => menuItems.filter((item) => item.description));
const linkGroups = computed(() => {
  const compact = menuItems.filter((item) => !item.description);
  return [
    { items: compact.filter((item) => !APP_PATHS.has(item.link)), label: "Mitmachen" },
    { items: compact.filter((item) => APP_PATHS.has(item.link)), label: "App" },
  ];
});

const MODES = [
  {
    icon: defineAsyncComponent(() => import("virtual:icons/lucide/sun")),
    label: "Hell",
    value: "light",
  },
  {
    icon: defineAsyncComponent(() => import("virtual:icons/lucide/moon")),
    label: "Dunkel",
    value: "dark",
  },
  {
    icon: defineAsyncComponent(() => import("virtual:icons/lucide/sun-moon")),
    label: "System",
    value: "system",
  },
] as const;

const isDarkMode = useStore($isDarkMode);
const mode = computed({
  get: () => (isDarkMode.value === null ? "system" : isDarkMode.value ? "dark" : "light"),
  set: (value: (typeof MODES)[number]["value"]) => {
    setDarkMode(value === "system" ? null : value === "dark");
    trackEvent("Color Mode", value, "Main Menu");
  },
});

const isPwaInstalled = useStore($isPwaInstalled);
</script>

<style lang="scss">
@use "@styles/components/main-menu";
</style>
