import { useStore } from "@nanostores/vue";
import {
  $notificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
} from "@stores/notificationPermission.ts";
import {
  $pushState,
  isPushSupported,
  isVapidConfigured,
  loadPushState,
  subscribePush,
  unsubscribePush,
} from "@stores/pushSubscription.ts";
import { computed, onMounted } from "vue";

export function useNotificationSettings() {
  const notificationPermission = useStore($notificationPermission);
  const pushState = useStore($pushState);

  const notificationsSupported = isNotificationSupported();
  const pushSupported = isPushSupported();
  const vapidConfigured = isVapidConfigured();

  const showPushSection = computed(
    () => pushSupported && notificationPermission.value === "granted",
  );

  onMounted(() => {
    if (pushSupported) void loadPushState();
  });

  function togglePush(): void {
    const s = pushState.value;
    if (s === "subscribed") void unsubscribePush();
    else if (s === "unsubscribed" || s === "error") void subscribePush();
  }

  return {
    notificationPermission,
    notificationsSupported,
    pushState,
    pushSupported,
    requestNotificationPermission,
    showPushSection,
    togglePush,
    vapidConfigured,
  };
}
