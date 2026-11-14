<template>
  <div
    ref="root"
    data-track-content
    data-content-name="Main Menu"
    data-content-piece="Navigation"
    data-content-target="#"
  >
    <DropdownPopover name="main-menu" placement="bottom-end" :offset="13" theme="nav">
      <template #default="{ triggerProps }">
        <MainMenuButton v-bind="triggerProps" />
      </template>

      <template #panel>
        <nav class="c-main-menu" aria-label="Hauptmenü">
          <div class="columns">
            <div v-if="discoverItems.length" class="col discover">
              <p class="label">Entdecken</p>
              <a
                v-for="item in discoverItems"
                :key="item.link"
                class="card"
                :href="item.link"
                :rel="item.rel"
              >
                <span class="tile">
                  <component :is="ICONS[item.link]" v-if="ICONS[item.link]" aria-hidden="true" />
                </span>
                <span class="text">
                  <span class="title">
                    {{ item.title }}
                    <span v-if="NEW_PATHS.has(item.link)" class="tag">Neu</span>
                  </span>
                  <span class="desc">{{ item.description }}</span>
                </span>
              </a>
            </div>

            <div class="col">
              <template v-for="group in linkGroups" :key="group.label">
                <p v-if="group.items.length" class="label">{{ group.label }}</p>
                <a
                  v-for="item in group.items"
                  :key="item.link"
                  class="link"
                  :href="item.link"
                  :rel="item.rel"
                >
                  <component :is="ICONS[item.link]" v-if="ICONS[item.link]" aria-hidden="true" />
                  {{ item.title }}
                </a>
              </template>

              <div class="modes"><ColorModePicker source="Main Menu" /></div>
            </div>
          </div>

          <div v-if="!isPwaInstalled" class="install">
            <span class="install-text">
              Mit der App bleibst Du immer informiert, ob online oder offline.
            </span>
            <span class="install-action">
              <InstallApp class="c-header-control" data-variant="primary compact">
                <DownloadIcon aria-hidden="true" /> App installieren
              </InstallApp>
            </span>
          </div>
        </nav>
      </template>
    </DropdownPopover>
  </div>
</template>

<script setup lang="ts">
import type { MenuItem } from "@services/payload/site.ts";
import type { Component } from "vue";

import ColorModePicker from "@components/ColorModePicker.vue";
import DropdownPopover from "@components/DropdownPopover.vue";
import MainMenuButton from "@components/MainMenuButton.vue";
import { useContentTracking } from "@composables/useContentTracking";
import { useStore } from "@nanostores/vue";
import { $isPwaInstalled } from "@stores/installApp.ts";
import { computed, defineAsyncComponent, ref } from "vue";

interface MainMenuProps {
  menuItems?: MenuItem[];
}

const { menuItems = [] } = defineProps<MainMenuProps>();

const root = ref<HTMLElement | null>(null);
useContentTracking(root);

// ponytail: the "Main Menu" is flat and only carries label/path/description, so
// icons, the "App" group and the "Neu" tag are keyed by path here. Move to menu
// fields in Payload once editors need to change them without a deploy.
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

// Only rendered inside the lazily mounted panel; the footer's InstallApp already
// catches the early beforeinstallprompt event on every page.
const InstallApp = defineAsyncComponent(() => import("@components/InstallApp.vue"));
const DownloadIcon = defineAsyncComponent(() => import("virtual:icons/lucide/download"));

// Items with a description are the big "Entdecken" cards; the rest are compact links.
const discoverItems = computed(() => menuItems.filter((item) => item.description));
const linkGroups = computed(() => {
  const compact = menuItems.filter((item) => !item.description);
  return [
    { items: compact.filter((item) => !APP_PATHS.has(item.link)), label: "Mitmachen" },
    { items: compact.filter((item) => APP_PATHS.has(item.link)), label: "App" },
  ];
});

const isPwaInstalled = useStore($isPwaInstalled);
</script>

<style lang="scss">
@use "@styles/components/main-menu";
</style>
