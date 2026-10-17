<template>
  <section class="c-app-settings__card">
    <h2 class="c-app-settings__card-title">
      <component :is="SunMoonIcon" class="c-app-settings__card-title-icon" />
      Erscheinungsbild
    </h2>
    <ColorModePicker source="Settings" show-labels />
  </section>
</template>

<script setup lang="ts">
import ColorModePicker from "@components/ColorModePicker.vue";
import { defineAsyncComponent } from "vue";

const SunMoonIcon = defineAsyncComponent(() => import("virtual:icons/lucide/sun-moon"));
</script>
