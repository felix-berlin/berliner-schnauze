<template>
  <button type="button" class="c-button c-header-control c-main-menu__button">
    <XIcon v-if="isOpen" aria-hidden="true" />
    <MenuIcon v-else aria-hidden="true" />
    Menü
  </button>
</template>

<script setup lang="ts">
import MenuIcon from "virtual:icons/lucide/menu";
import XIcon from "virtual:icons/lucide/x";

const { isOpen = false } = defineProps<{ isOpen?: boolean }>();
</script>
