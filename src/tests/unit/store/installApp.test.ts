import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();

  Object.defineProperty(global.window, "matchMedia", {
    value: vi.fn().mockReturnValue({ matches: false }),
    writable: true,
    configurable: true,
  });
  Object.defineProperty(global.window.navigator, "standalone", {
    value: undefined,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isPwaInstalled", () => {
  it("returns false when not in standalone display mode", async () => {
    const { isPwaInstalled } = await import("@stores/installApp.ts");
    expect(isPwaInstalled()).toBe(false);
  });

  it("returns true when matchMedia reports standalone", async () => {
    Object.defineProperty(global.window, "matchMedia", {
      value: vi.fn().mockReturnValue({ matches: true }),
      writable: true,
      configurable: true,
    });
    const { isPwaInstalled } = await import("@stores/installApp.ts");
    expect(isPwaInstalled()).toBe(true);
  });

  it("returns true when navigator.standalone is true (iOS)", async () => {
    Object.defineProperty(global.window.navigator, "standalone", {
      value: true,
      writable: true,
      configurable: true,
    });
    const { isPwaInstalled } = await import("@stores/installApp.ts");
    expect(isPwaInstalled()).toBe(true);
  });
});

describe("disableInAppInstallPrompt", () => {
  it("sets $installPrompt to null and $showInstallButton to false", async () => {
    const { disableInAppInstallPrompt, $installPrompt, $showInstallButton } = await import(
      "@stores/installApp.ts"
    );
    $showInstallButton.set(true);
    disableInAppInstallPrompt();
    expect($installPrompt.get()).toBeNull();
    expect($showInstallButton.get()).toBe(false);
  });
});

describe("onMount cleanup", () => {
  it("removes event listeners after STORE_UNMOUNT_DELAY when last subscriber leaves", async () => {
    vi.useFakeTimers();
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const { $installPrompt } = await import("@stores/installApp.ts");
    const unsub = $installPrompt.subscribe(() => {});
    unsub();
    vi.advanceTimersByTime(1001);
    expect(removeEventListenerSpy).toHaveBeenCalledWith("beforeinstallprompt", expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith("appinstalled", expect.any(Function));
    vi.useRealTimers();
  });

  it("beforeinstallprompt event sets $installPrompt and shows install button", async () => {
    const { $installPrompt, $showInstallButton } = await import("@stores/installApp.ts");
    const unsub = $installPrompt.subscribe(() => {});
    const fakeEvent = new Event("beforeinstallprompt");
    window.dispatchEvent(fakeEvent);
    expect($installPrompt.get()).toBe(fakeEvent);
    expect($showInstallButton.get()).toBe(true);
    unsub();
  });

  it("appinstalled event tracks analytics", async () => {
    const { trackEvent } = await import("@utils/analytics");
    const { $installPrompt } = await import("@stores/installApp.ts");
    const unsub = $installPrompt.subscribe(() => {});
    window.dispatchEvent(new Event("appinstalled"));
    expect(trackEvent).toHaveBeenCalledWith("App", "Installation completed", "PWA");
    unsub();
  });
});
