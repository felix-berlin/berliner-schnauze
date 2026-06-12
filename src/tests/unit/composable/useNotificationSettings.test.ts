import { atom } from "nanostores";
import type { PushState } from "@stores/pushSubscription.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, nextTick } from "vue";

// ---- top-level mocks (hoisted by Vitest) -----------------------------------
// Mock isPushSupported so tests are not coupled to window.PushManager presence.

const mockSubscribePush = vi.fn().mockResolvedValue(undefined);
const mockUnsubscribePush = vi.fn().mockResolvedValue(undefined);
const mockLoadPushState = vi.fn().mockResolvedValue(undefined);
const mockIsPushSupported = vi.fn().mockReturnValue(true);
const $mockPushState = atom<PushState>("unsubscribed");

vi.mock("@stores/pushSubscription.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stores/pushSubscription.ts")>();
  return {
    ...actual,
    $pushState: $mockPushState,
    isPushSupported: mockIsPushSupported,
    subscribePush: mockSubscribePush,
    unsubscribePush: mockUnsubscribePush,
    loadPushState: mockLoadPushState,
  };
});

vi.mock("@stores/toastNotify.ts", () => ({ createToastNotify: vi.fn() }));
vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

// ---- helper ---------------------------------------------------------------

function withSetup<T>(composable: () => T): { result: T; unmount: () => void } {
  let result!: T;
  const app = createApp({
    setup() {
      result = composable();
      return () => null;
    },
  });
  const el = document.createElement("div");
  app.mount(el);
  return { result, unmount: () => app.unmount() };
}

// ---- setup ----------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockIsPushSupported.mockReturnValue(true);
  $mockPushState.set("unsubscribed");

  Object.defineProperty(global, "Notification", {
    value: { permission: "default" as NotificationPermission, requestPermission: vi.fn() },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---- showPushSection -------------------------------------------------------

describe("showPushSection", () => {
  it("is false when notification permission is not granted", async () => {
    const { $notificationPermission } = await import("@stores/notificationPermission.ts");
    $notificationPermission.set("default");
    const { useNotificationSettings } = await import("@composables/useNotificationSettings.ts");
    const { result, unmount } = withSetup(() => useNotificationSettings());
    await nextTick();
    expect(result.showPushSection.value).toBe(false);
    unmount();
  });

  it("is true when pushSupported and permission is granted", async () => {
    global.Notification.permission = "granted";
    const { $notificationPermission } = await import("@stores/notificationPermission.ts");
    $notificationPermission.set("granted");
    const { useNotificationSettings } = await import("@composables/useNotificationSettings.ts");
    const { result, unmount } = withSetup(() => useNotificationSettings());
    await nextTick();
    expect(result.showPushSection.value).toBe(true);
    unmount();
  });

  it("is false when push is not supported even if permission granted", async () => {
    mockIsPushSupported.mockReturnValue(false);
    const { $notificationPermission } = await import("@stores/notificationPermission.ts");
    $notificationPermission.set("granted");
    const { useNotificationSettings } = await import("@composables/useNotificationSettings.ts");
    const { result, unmount } = withSetup(() => useNotificationSettings());
    await nextTick();
    expect(result.showPushSection.value).toBe(false);
    unmount();
  });
});

// ---- togglePush -----------------------------------------------------------

describe("togglePush", () => {
  it("calls unsubscribePush when state is subscribed", async () => {
    $mockPushState.set("subscribed");
    const { useNotificationSettings } = await import("@composables/useNotificationSettings.ts");
    const { result, unmount } = withSetup(() => useNotificationSettings());
    await nextTick();
    result.togglePush();
    expect(mockUnsubscribePush).toHaveBeenCalledOnce();
    unmount();
  });

  it("calls subscribePush when state is unsubscribed", async () => {
    $mockPushState.set("unsubscribed");
    const { useNotificationSettings } = await import("@composables/useNotificationSettings.ts");
    const { result, unmount } = withSetup(() => useNotificationSettings());
    await nextTick();
    result.togglePush();
    expect(mockSubscribePush).toHaveBeenCalledOnce();
    unmount();
  });

  it("calls subscribePush when state is error (retry path)", async () => {
    $mockPushState.set("error");
    const { useNotificationSettings } = await import("@composables/useNotificationSettings.ts");
    const { result, unmount } = withSetup(() => useNotificationSettings());
    await nextTick();
    result.togglePush();
    expect(mockSubscribePush).toHaveBeenCalledOnce();
    unmount();
  });

  it("is a no-op when state is loading", async () => {
    $mockPushState.set("loading");
    const { useNotificationSettings } = await import("@composables/useNotificationSettings.ts");
    const { result, unmount } = withSetup(() => useNotificationSettings());
    await nextTick();
    result.togglePush();
    expect(mockSubscribePush).not.toHaveBeenCalled();
    expect(mockUnsubscribePush).not.toHaveBeenCalled();
    unmount();
  });

  it("is a no-op when state is unsupported", async () => {
    $mockPushState.set("unsupported");
    const { useNotificationSettings } = await import("@composables/useNotificationSettings.ts");
    const { result, unmount } = withSetup(() => useNotificationSettings());
    await nextTick();
    result.togglePush();
    expect(mockSubscribePush).not.toHaveBeenCalled();
    expect(mockUnsubscribePush).not.toHaveBeenCalled();
    unmount();
  });
});

// ---- onMounted ------------------------------------------------------------

describe("onMounted", () => {
  it("calls loadPushState when pushSupported", async () => {
    mockIsPushSupported.mockReturnValue(true);
    const { useNotificationSettings } = await import("@composables/useNotificationSettings.ts");
    const { unmount } = withSetup(() => useNotificationSettings());
    await nextTick();
    expect(mockLoadPushState).toHaveBeenCalledOnce();
    unmount();
  });

  it("does not call loadPushState when push is not supported", async () => {
    mockIsPushSupported.mockReturnValue(false);
    const { useNotificationSettings } = await import("@composables/useNotificationSettings.ts");
    const { unmount } = withSetup(() => useNotificationSettings());
    await nextTick();
    expect(mockLoadPushState).not.toHaveBeenCalled();
    unmount();
  });

  it("syncs notificationPermission atom from browser on mount", async () => {
    global.Notification.permission = "granted";
    const { $notificationPermission } = await import("@stores/notificationPermission.ts");
    $notificationPermission.set("unsupported"); // stale SSR value
    const { useNotificationSettings } = await import("@composables/useNotificationSettings.ts");
    const { unmount } = withSetup(() => useNotificationSettings());
    await nextTick();
    expect($notificationPermission.get()).toBe("granted");
    unmount();
  });
});
