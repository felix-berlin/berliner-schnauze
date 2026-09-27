<template>
  <button type="button" class="c-button c-header-control">
    <!-- Both icons stay mounted; [aria-expanded] from DropdownPopover crossfades them in CSS. -->
    <span class="c-header-control__icons" aria-hidden="true">
      <MenuIcon class="c-header-control__icon c-header-control__icon--menu" />
      <XIcon class="c-header-control__icon c-header-control__icon--close" />
    </span>
    Menü
  </button>
</template>

<script setup lang="ts">
import MenuIcon from "virtual:icons/lucide/menu";
import XIcon from "virtual:icons/lucide/x";
</script>
