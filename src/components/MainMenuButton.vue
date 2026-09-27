<template>
  <button type="button" class="c-button c-header-control">
    <XIcon v-if="isOpen" aria-hidden="true" />
    <MenuIcon v-else aria-hidden="true" />
    Menü
  </button>
</template>

<script setup lang="ts">
import MenuIcon from "virtual:icons/lucide/menu";
import { defineAsyncComponent } from "vue";

// Only shown once the menu is open; MenuIcon stays eager because it's in the SSR markup.
const XIcon = defineAsyncComponent(() => import("virtual:icons/lucide/x"));

const { isOpen = false } = defineProps<{ isOpen?: boolean }>();
</script>
