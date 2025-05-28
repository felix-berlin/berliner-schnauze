<template>
  <span class="c-shortcut">
    <kbd><CornerDownLeftIcon aria-label="Enter Taste" class="c-shortcut__key" /></kbd>
    <span class="c-shortcut__text">zum auswählen</span>
  </span>
  <span class="c-shortcut">
    <kbd><ArrowUpIcon aria-label="Pfeil oben Taste" class="c-shortcut__key" /></kbd>
    <kbd><ArrowDownIcon aria-label="Pfeil unten Taste" class="c-shortcut__key" /></kbd>
    <span class="c-shortcut__text">zum navigieren</span>
  </span>
  <span class="c-shortcut">
    <kbd class="c-shortcut__key">ESC</kbd>
    <span class="c-shortcut__text">zum schließen</span>
  </span>
</template>

<script setup lang="ts">
import ArrowUpIcon from "virtual:icons/lucide/arrow-up";
import ArrowDownIcon from "virtual:icons/lucide/arrow-down";
import CornerDownLeftIcon from "virtual:icons/lucide/corner-down-left";
</script>

<style scoped></style>
