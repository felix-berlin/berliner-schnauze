<template>
  <div v-if="!online" class="c-state o-word-offline" data-variant="offline" role="status">
    <WifiOff aria-hidden="true" height="18" width="18" />
    <span class="body">
      <b>Du bist offline.</b>
      <span>
        Du siehst die jespeicherte Version. Abstimmen und Kommentieren jeht wieder, sobald du Netz
        hast.
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { useOnline } from "@vueuse/core";
import WifiOff from "virtual:icons/lucide/wifi-off";

// Spec §9: reading works offline, the poll tiles and „Kommentar schreiben“ lock themselves (aria-disabled).
const online = useOnline();
</script>
