<template>
  <section class="c-home-togo" aria-label="Berlinerisch zum Mitnehmen">
    <div class="inner">
      <!-- Install states come from InstallApp (disabled + tooltip without a prompt); installed: the half drops. -->
      <div v-if="!isPwaInstalled" class="item">
        <SmartphoneIcon class="icon" aria-hidden="true" />
        <p class="text">
          <b>Als App uffs Handy</b>
          <span>Offline, mit Wort des Tages. Ohne Store.</span>
        </p>
        <InstallApp v-if="mounted" data-variant="primary lg">App installieren</InstallApp>
        <!-- Server stand-in, same size: InstallApp reads matchMedia once its store mounts and starts disabled anyway. -->
        <button v-else class="c-button" data-variant="primary lg" type="button" disabled>
          App installieren
        </button>
      </div>
      <div class="item">
        <DeckIcon class="icon" aria-hidden="true" />
        <p class="text">
          <b>Anki-Deck zum Lernen</b>
          <span>Lite für lau, volles Deck einmal kaufen.</span>
        </p>
        <a class="c-button" data-variant="lg" href="/anki">Deck laden</a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import InstallApp from "@components/InstallApp.vue";
import { useStore } from "@nanostores/vue";
import { $isPwaInstalled } from "@stores/installApp.ts";
import { useMounted } from "@vueuse/core";
import { defineAsyncComponent } from "vue";

const SmartphoneIcon = defineAsyncComponent(() => import("virtual:icons/lucide/smartphone"));
const DeckIcon = defineAsyncComponent(() => import("virtual:icons/lucide/copy"));

// Same wiring as FooterAppSection: InstallApp mounts $installPrompt, whose onMount sets $isPwaInstalled.
const isPwaInstalled = useStore($isPwaInstalled);
const mounted = useMounted();
</script>

<style lang="scss">
@use "@styles/components/home-togo";
</style>
