import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@stores/toastNotify.ts", () => ({ createToastNotify: vi.fn() }));
vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

const mockRequestPermission = vi.fn();
Object.defineProperty(global, "Notification", {
  value: { permission: "default" as NotificationPermission, requestPermission: mockRequestPermission },
  writable: true,
  configurable: true,
});

describe("notificationPermission store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    Object.defineProperty(global.Notification, "permission", { value: "default", writable: true });
  });

  it("initializes with Notification.permission value", async () => {
    const { $notificationPermission } = await import("@stores/notificationPermission.ts");
    expect($notificationPermission.get()).toBe("default");
  });

  it("requestNotificationPermission calls browser API and updates atom", async () => {
    mockRequestPermission.mockResolvedValue("granted");
    const { requestNotificationPermission, $notificationPermission } = await import(
      "@stores/notificationPermission.ts"
    );
    await requestNotificationPermission();
    expect(mockRequestPermission).toHaveBeenCalledOnce();
    expect($notificationPermission.get()).toBe("granted");
  });

  it("tracks the permission result via analytics", async () => {
    mockRequestPermission.mockResolvedValue("granted");
    const { requestNotificationPermission } = await import("@stores/notificationPermission.ts");
    const { trackEvent } = await import("@utils/analytics");
    await requestNotificationPermission();
    expect(trackEvent).toHaveBeenCalledWith("App", "Notification permission granted", "PWA");
  });

  it("tracks denied result via analytics", async () => {
    mockRequestPermission.mockResolvedValue("denied");
    const { requestNotificationPermission } = await import("@stores/notificationPermission.ts");
    const { trackEvent } = await import("@utils/analytics");
    await requestNotificationPermission();
    expect(trackEvent).toHaveBeenCalledWith("App", "Notification permission denied", "PWA");
  });

  it("handles denied permission", async () => {
    mockRequestPermission.mockResolvedValue("denied");
    const { requestNotificationPermission, $notificationPermission } = await import(
      "@stores/notificationPermission.ts"
    );
    await requestNotificationPermission();
    expect($notificationPermission.get()).toBe("denied");
  });

  it("is a no-op when already granted", async () => {
    Object.defineProperty(global.Notification, "permission", { value: "granted", writable: true });
    const { requestNotificationPermission } = await import("@stores/notificationPermission.ts");
    await requestNotificationPermission();
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it("is a no-op when already denied — browser dialog is not re-shown", async () => {
    Object.defineProperty(global.Notification, "permission", { value: "denied", writable: true });
    const { requestNotificationPermission } = await import("@stores/notificationPermission.ts");
    await requestNotificationPermission();
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it("shows toast and does not update atom when requestPermission throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockRequestPermission.mockRejectedValue(new TypeError("Not allowed"));
    const { requestNotificationPermission, $notificationPermission } = await import(
      "@stores/notificationPermission.ts"
    );
    const { createToastNotify } = await import("@stores/toastNotify.ts");
    await requestNotificationPermission();
    expect(createToastNotify).toHaveBeenCalledOnce();
    expect($notificationPermission.get()).toBe("default");
  });

  it("isNotificationSupported returns true when Notification is in window", async () => {
    const { isNotificationSupported } = await import("@stores/notificationPermission.ts");
    expect(isNotificationSupported()).toBe(true);
  });

  it("isNotificationSupported returns false when Notification absent", async () => {
    vi.stubGlobal("Notification", undefined);
    const { isNotificationSupported } = await import("@stores/notificationPermission.ts");
    expect(isNotificationSupported()).toBe(false);
    vi.unstubAllGlobals();
  });

  it("requestNotificationPermission returns early when not supported", async () => {
    vi.stubGlobal("Notification", undefined);
    const { requestNotificationPermission } = await import("@stores/notificationPermission.ts");
    await requestNotificationPermission();
    expect(mockRequestPermission).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
