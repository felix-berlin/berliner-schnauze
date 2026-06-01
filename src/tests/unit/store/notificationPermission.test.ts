import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequestPermission = vi.fn();
Object.defineProperty(global, "Notification", {
  value: { permission: "default" as NotificationPermission, requestPermission: mockRequestPermission },
  writable: true,
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

  it("isNotificationSupported returns boolean", async () => {
    const { isNotificationSupported } = await import("@stores/notificationPermission.ts");
    expect(typeof isNotificationSupported()).toBe("boolean");
  });
});
