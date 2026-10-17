<template>
  <div class="c-pwa-cache__header">
    <h1 class="c-pwa-cache__title">Offline-Cache</h1>
    <span
      class="c-pwa-cache__status"
      :class="onlineStatus === 'online' ? 'is-online' : 'is-offline'"
    >
      {{ onlineStatus === "online" ? "● Online" : "○ Offline" }}
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  onlineStatus: "online" | "offline";
}>();
</script>
