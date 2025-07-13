<template>
  <button
    v-if="supportsPushNotifications() && !isPermissionGranted"
    type="button"
    class="notification-button"
    :disabled="isRequestingPermission"
    @click="handleRequestPermission"
  >
    <Leaf class="notification-button__icon" />
    <span class="notification-button__text">
      {{
        isRequestingPermission ? "Berechtigung wird angefragt..." : "Benachrichtigungen aktivieren"
      }}
    </span>
  </button>
</template>

<script setup lang="ts">
import {
  isNotificationPermitted,
  requestNotificationPermission,
  supportsPushNotifications,
} from "@services/pushNotifications";
import { createToastNotify } from "@stores/toastNotify";
import Leaf from "virtual:icons/lucide/leaf";
import { computed, ref } from "vue";

const isRequestingPermission = ref(false);

const isPermissionGranted = computed(() => isNotificationPermitted());

const handleRequestPermission = async (): Promise<void> => {
  if (isRequestingPermission.value) return;

  isRequestingPermission.value = true;

  try {
    const permission = await requestNotificationPermission();

    if (permission === "granted") {
      createToastNotify({
        message:
          "Benachrichtigungen wurden aktiviert! Du erhältst jetzt Updates über App-Aktualisierungen.",
        showClose: true,
        status: "success",
        timeout: 8000,
      });
    } else if (permission === "denied") {
      createToastNotify({
        message:
          "Benachrichtigungen wurden verweigert. Du kannst sie in den Browser-Einstellungen aktivieren.",
        showClose: true,
        status: "warning",
        timeout: 10000,
      });
    } else {
      createToastNotify({
        message: "Benachrichtigungen wurden nicht aktiviert.",
        showClose: true,
        status: "info",
        timeout: 5000,
      });
    }
  } catch (error) {
    console.error("Failed to request notification permission:", error);
    createToastNotify({
      message: "Fehler beim Aktivieren der Benachrichtigungen.",
      showClose: true,
      status: "error",
      timeout: 5000,
    });
  } finally {
    isRequestingPermission.value = false;
  }
};
</script>

<style lang="scss" scoped>
.notification-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-primary);
  color: var(--color-primary-contrast);
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  font-weight: 500;

  &:hover:not(:disabled) {
    background: var(--color-primary-hover);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  &__icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  &__text {
    white-space: nowrap;
  }
}
</style>
