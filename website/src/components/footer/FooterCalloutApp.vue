<template>
  <section v-if="show" :aria-labelledby="titleId" class="c-footer-callout">
    <div class="inner u-max-body-width">
      <div class="text">
        <h2 :id="titleId" class="title">Hol dir de Schnauze uffs Handy</h2>
        <p class="lead">
          Berliner Schnauze als App uff’n Startbildschirm: immer griffbereit, ooch wenn de mal keen
          Netz hast.
        </p>
      </div>
      <div class="actions">
        <InstallApp data-variant="primary center-icon raised xl">App installieren</InstallApp>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import InstallApp from "@components/InstallApp.vue";
import { useStore } from "@nanostores/vue";
import { $showAppCallout } from "@stores/footerCallout.ts";
import { useId } from "vue";

const show = useStore($showAppCallout);
const titleId = `footer-callout-${useId()}`;
</script>

<style lang="scss">
@use "@styles/components/footer-callout";
</style>
