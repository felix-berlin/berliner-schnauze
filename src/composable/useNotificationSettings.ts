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
import type { ComputedRef, Ref } from "vue";
import { computed, onMounted, ref } from "vue";
import type { NotificationPermissionState } from "@stores/notificationPermission.ts";
import type { PushState } from "@stores/pushSubscription.ts";

export interface NotificationSettingsComposable {
  notificationPermission: Readonly<Ref<NotificationPermissionState>>;
  notificationsSupported: boolean;
  pushState: Readonly<Ref<PushState>>;
  pushSupported: boolean;
  requestNotificationPermission: () => Promise<void>;
  showPushSection: ComputedRef<boolean>;
  showRevokeHint: Ref<boolean>;
  togglePush: () => void;
  vapidConfigured: boolean;
}

export function useNotificationSettings(): NotificationSettingsComposable {
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
    // Sync permission atom on mount — fixes SSR hydration where atom initialised as "unsupported"
    if (isNotificationSupported()) {
      $notificationPermission.set(Notification.permission);
    }
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
    showRevokeHint,
    togglePush,
    vapidConfigured,
  };
}
