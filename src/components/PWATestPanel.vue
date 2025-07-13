<template>
  <div class="pwa-test-panel">
    <h2>PWA Auto-Update Test Panel</h2>

    <div class="test-section">
      <h3>Push Notifications</h3>
      <div class="test-controls">
        <p><strong>Permission Status:</strong> {{ notificationPermission }}</p>
        <p><strong>Browser Support:</strong> {{ supportsPushNotifications() ? "Yes" : "No" }}</p>

        <div class="button-group">
          <NotificationButton />

          <button
            v-if="isNotificationPermitted()"
            type="button"
            class="test-button"
            @click="testUpdateNotification"
          >
            Test Update Notification
          </button>

          <button type="button" class="test-button" @click="testCustomNotification">
            Test Custom Notification
          </button>

          <button
            type="button"
            class="test-button test-button--secondary"
            @click="debugNotifications"
          >
            Debug Notifications
          </button>
        </div>
      </div>
    </div>

    <div class="test-section">
      <h3>Service Worker Status</h3>
      <div class="test-controls">
        <p><strong>Registration:</strong> {{ swRegistration ? "Active" : "None" }}</p>
        <p><strong>Controller:</strong> {{ swController ? "Active" : "None" }}</p>
        <p><strong>Update Available:</strong> {{ updateAvailable ? "Yes" : "No" }}</p>

        <div class="button-group">
          <button
            type="button"
            class="test-button"
            :disabled="!swRegistration"
            @click="checkForUpdates"
          >
            Check for Updates
          </button>

          <button type="button" class="test-button" @click="forceUpdate">
            Force Service Worker Update
          </button>

          <button type="button" class="test-button" @click="simulateUpdate">
            Simulate Auto-Update
          </button>
        </div>
      </div>
    </div>

    <div class="test-section">
      <h3>Event Log</h3>
      <div class="event-log">
        <div
          v-for="(event, index) in eventLog"
          :key="index"
          class="event-log__item"
          :class="`event-log__item--${event.type}`"
        >
          <span class="event-log__time">{{ event.time }}</span>
          <span class="event-log__message">{{ event.message }}</span>
        </div>
      </div>
      <button type="button" class="test-button test-button--secondary" @click="clearLog">
        Clear Log
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import NotificationButton from "@components/NotificationButton.vue";
import {
  isNotificationPermitted,
  showNotification,
  showUpdateNotification,
  supportsPushNotifications,
} from "@services/pushNotifications";
import { createToastNotify } from "@stores/toastNotify";
import { onMounted, onUnmounted, ref } from "vue";

interface EventLogEntry {
  message: string;
  time: string;
  type: "error" | "info" | "success" | "warning";
}

const notificationPermission = ref<NotificationPermission>("default");
const swRegistration = ref<null | ServiceWorkerRegistration>(null);
const swController = ref<null | ServiceWorker>(null);
const updateAvailable = ref(false);
const eventLog = ref<EventLogEntry[]>([]);
const isDevelopmentMode = ref(import.meta.env.DEV);

const addToLog = (message: string, type: EventLogEntry["type"] = "info"): void => {
  const now = new Date();
  const time = now.toLocaleTimeString();
  eventLog.value.unshift({ message, time, type });

  // Keep only last 50 entries
  if (eventLog.value.length > 50) {
    eventLog.value = eventLog.value.slice(0, 50);
  }
};

const clearLog = (): void => {
  eventLog.value = [];
};

const testUpdateNotification = async (): Promise<void> => {
  addToLog("Attempting to send update notification...", "info");

  // Check if notifications are supported
  if (!supportsPushNotifications()) {
    addToLog("Push notifications not supported in this browser", "error");
    return;
  }

  // Check permission
  if (!isNotificationPermitted()) {
    addToLog("Notification permission not granted", "warning");
    return;
  }

  try {
    await showUpdateNotification();
    addToLog("Update notification sent", "success");
  } catch (error) {
    addToLog(`Failed to send update notification: ${String(error)}`, "error");
  }
};

const testCustomNotification = async (): Promise<void> => {
  addToLog("Attempting to send custom notification...", "info");

  // Check if notifications are supported
  if (!supportsPushNotifications()) {
    addToLog("Push notifications not supported in this browser", "error");
    return;
  }

  // Check permission
  if (!isNotificationPermitted()) {
    addToLog("Notification permission not granted", "warning");
    return;
  }

  try {
    await showNotification({
      badge: "/favicons/favicon-32x32.png",
      body: "Dies ist eine Test-Benachrichtigung um die Funktionalität zu überprüfen.",
      icon: "/favicons/android-chrome-192x192.png",
      tag: "test-notification",
      title: "Test Benachrichtigung",
    });
    addToLog("Custom notification sent", "success");
  } catch (error) {
    addToLog(`Failed to send custom notification: ${String(error)}`, "error");
  }
};

const checkForUpdates = async (): Promise<void> => {
  if (!swRegistration.value) {
    addToLog("No service worker registration found", "warning");
    return;
  }

  try {
    await swRegistration.value.update();
    addToLog("Checked for updates", "info");
  } catch (error) {
    addToLog(`Failed to check for updates: ${String(error)}`, "error");
  }
};

const forceUpdate = (): void => {
  // Unregister and reload to force update simulation
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        void registration.unregister();
      }
      addToLog("Service worker unregistered, reload the page to re-register", "info");
    });
  }
};

const simulateUpdate = (): void => {
  // Simulate the update process by dispatching events
  addToLog("Simulating auto-update process...", "info");

  // Simulate update available
  setTimeout(() => {
    updateAvailable.value = true;
    addToLog("Update available detected", "info");

    createToastNotify({
      message: "Ein Update wird heruntergeladen und automatisch angewendet...",
      showClose: true,
      status: "info",
      timeout: 5000,
    });
  }, 1000);

  // Simulate update completed
  setTimeout(() => {
    addToLog("Update completed - showing notifications", "success");

    createToastNotify({
      message: "App erfolgreich aktualisiert! Die neueste Version ist jetzt aktiv.",
      showClose: true,
      status: "success",
      timeout: 8000,
    });

    if (isNotificationPermitted()) {
      void testUpdateNotification();
    } else {
      addToLog("Push notification not sent - permission not granted", "warning");
    }

    updateAvailable.value = false;
  }, 3000);
};

const setupServiceWorkerListeners = (): void => {
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.ready
      .then((registration) => {
        swRegistration.value = registration;
        addToLog("Service worker registration ready", "success");
      })
      .catch((error) => {
        addToLog(`Service worker registration failed: ${String(error)}`, "error");

        // In development mode, simulate a service worker registration
        if (isDevelopmentMode.value) {
          addToLog("Development mode: simulating service worker registration", "info");
          // Create a mock registration object for testing
          const mockRegistration = {
            update: async () => {
              addToLog("Mock: Service worker update called", "info");
              return Promise.resolve();
            },
          } as ServiceWorkerRegistration;
          swRegistration.value = mockRegistration;
        }
      });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      swController.value = navigator.serviceWorker.controller;
      addToLog("Service worker controller changed", "info");
    });

    navigator.serviceWorker.addEventListener("message", (event) => {
      addToLog(`Service worker message: ${JSON.stringify(event.data)}`, "info");
    });
  } else if (isDevelopmentMode.value) {
    // Simulate service worker support in development
    addToLog("Development mode: navigator.serviceWorker not available, creating mock", "warning");
    const mockRegistration = {
      update: async () => {
        addToLog("Mock: Service worker update called", "info");
        return Promise.resolve();
      },
    } as ServiceWorkerRegistration;
    swRegistration.value = mockRegistration;
  }
};

const checkPermissionChanges = (): void => {
  // Only run on client side where Notification is available
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  // Initialize with current permission
  notificationPermission.value = Notification.permission;

  const checkPermission = (): void => {
    if (notificationPermission.value !== Notification.permission) {
      const oldPermission = notificationPermission.value;
      notificationPermission.value = Notification.permission;
      addToLog(
        `Notification permission changed: ${oldPermission} → ${Notification.permission}`,
        "info",
      );
    }
  };

  // Check every 2 seconds
  setInterval(checkPermission, 2000);
};

const debugNotifications = (): void => {
  addToLog("=== Notification Debug Info ===", "info");
  addToLog(`typeof window: ${typeof window}`, "info");
  addToLog(`'Notification' in window: ${"Notification" in window}`, "info");
  addToLog(`'serviceWorker' in navigator: ${"serviceWorker" in navigator}`, "info");

  if (typeof window !== "undefined" && "Notification" in window) {
    addToLog(`Notification.permission: ${Notification.permission}`, "info");
    addToLog(`supportsPushNotifications(): ${supportsPushNotifications()}`, "info");
    addToLog(`isNotificationPermitted(): ${isNotificationPermitted()}`, "info");
  } else {
    addToLog("Notification API not available", "warning");
  }

  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        addToLog(`Service worker registrations found: ${registrations.length}`, "info");
        registrations.forEach((reg, index) => {
          addToLog(`Registration ${index}: ${reg.scope}`, "info");
        });
      })
      .catch((error) => {
        addToLog(`Error getting registrations: ${String(error)}`, "error");
      });
  }

  addToLog("=== End Debug Info ===", "info");
};

onMounted(() => {
  addToLog("PWA Test Panel initialized", "info");
  addToLog(`Development mode: ${isDevelopmentMode.value}`, "info");
  addToLog(`Browser supports notifications: ${supportsPushNotifications()}`, "info");
  addToLog(
    `Current notification permission: ${typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unknown"}`,
    "info",
  );

  setupServiceWorkerListeners();
  checkPermissionChanges();

  // Only access navigator on client side
  if ("serviceWorker" in navigator) {
    swController.value = navigator.serviceWorker.controller;
    addToLog(`Service worker controller: ${swController.value ? "Active" : "None"}`, "info");
  } else {
    addToLog("Service worker not supported in this browser", "warning");
  }
});

onUnmounted(() => {
  addToLog("PWA Test Panel destroyed", "info");
});
</script>

<style lang="scss" scoped>
.pwa-test-panel {
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
  background: var(--color-surface);
  border-radius: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  h2 {
    color: var(--color-primary);
    margin-bottom: 2rem;
    text-align: center;
  }

  h3 {
    color: var(--color-text);
    margin-bottom: 1rem;
    border-bottom: 2px solid var(--color-border);
    padding-bottom: 0.5rem;
  }
}

.test-section {
  margin-bottom: 2rem;

  &:last-child {
    margin-bottom: 0;
  }
}

.test-controls {
  p {
    margin-bottom: 0.5rem;

    strong {
      font-weight: 600;
      color: var(--color-text-emphasis);
    }
  }
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1rem;
}

.test-button {
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
    background: var(--color-disabled);
  }

  &--secondary {
    background: var(--color-secondary);
    color: var(--color-secondary-contrast);

    &:hover:not(:disabled) {
      background: var(--color-secondary-hover);
    }
  }
}

.event-log {
  max-height: 300px;
  overflow-y: auto;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
  font-family: monospace;
  font-size: 0.875rem;

  &__item {
    display: flex;
    margin-bottom: 0.5rem;
    padding: 0.25rem 0;

    &:last-child {
      margin-bottom: 0;
    }

    &--info {
      color: var(--color-text);
    }

    &--success {
      color: var(--color-success);
    }

    &--warning {
      color: var(--color-warning);
    }

    &--error {
      color: var(--color-error);
    }
  }

  &__time {
    font-weight: 600;
    margin-right: 1rem;
    min-width: 80px;
    opacity: 0.7;
  }

  &__message {
    flex: 1;
  }
}
</style>
