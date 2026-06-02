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
import { computed, onMounted, ref } from "vue";

export function useNotificationSettings() {
  const notificationPermission = useStore($notificationPermission);
  const pushState = useStore($pushState);

  const notificationsSupported = isNotificationSupported();
  const pushSupported = isPushSupported();
  const vapidConfigured = isVapidConfigured();
  const showRevokeHint = ref(false);

  const showPushSection = computed(
    () => pushSupported && notificationPermission.value === "granted",
  );

  onMounted(() => {
    if (pushSupported) void loadPushState();
  });

  function togglePush(): void {
    if (pushState.value === "subscribed") void unsubscribePush();
    else if (pushState.value === "unsubscribed") void subscribePush();
  }

  return {
    notificationPermission,
    notificationsSupported,
    pushState,
    pushSupported,
    requestNotificationPermission,
    showPushSection,
    showRevokeHint,
    togglePush,
    vapidConfigured,
  };
}
