<template>
  <button type="button" class="c-button c-header-control">
    <!-- Both icons stay mounted; [aria-expanded] from DropdownPopover crossfades them in CSS. -->
    <span class="icons" aria-hidden="true">
      <MenuIcon class="icon menu" />
      <XIcon class="icon close" />
    </span>
    Menü
  </button>
</template>

<script setup lang="ts">
import MenuIcon from "virtual:icons/lucide/menu";
import XIcon from "virtual:icons/lucide/x";
</script>

<style lang="scss">
@use "@styles/components/header-control";
</style>
