import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@utils/analytics", () => ({
  trackEvent: vi.fn(),
}));

describe("installApp store", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.defineProperty(window, "matchMedia", {
      value: vi.fn().mockReturnValue({ matches: false }),
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window.navigator, "standalone", {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("isPwaInstalled", () => {
    it("returns false when matchMedia returns false and standalone is undefined", async () => {
      const { isPwaInstalled } = await import("@stores/installApp.ts");
      expect(isPwaInstalled()).toBe(false);
    });

    it("returns true when matchMedia returns true (standalone display mode)", async () => {
      Object.defineProperty(window, "matchMedia", {
        value: vi.fn().mockReturnValue({ matches: true }),
        writable: true,
        configurable: true,
      });
      const { isPwaInstalled } = await import("@stores/installApp.ts");
      expect(isPwaInstalled()).toBe(true);
    });

    it("returns true when navigator.standalone is true", async () => {
      Object.defineProperty(window, "matchMedia", {
        value: vi.fn().mockReturnValue({ matches: false }),
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window.navigator, "standalone", {
        value: true,
        writable: true,
        configurable: true,
      });
      const { isPwaInstalled } = await import("@stores/installApp.ts");
      expect(isPwaInstalled()).toBe(true);
    });
  });

  describe("disableInAppInstallPrompt", () => {
    it("sets $installPrompt to null", async () => {
      const { $installPrompt, disableInAppInstallPrompt } = await import("@stores/installApp.ts");
      $installPrompt.set({ prompt: vi.fn() } as unknown as Parameters<typeof $installPrompt.set>[0]);
      disableInAppInstallPrompt();
      expect($installPrompt.get()).toBeNull();
    });

    it("sets $showInstallButton to false", async () => {
      const { $showInstallButton, disableInAppInstallPrompt } = await import("@stores/installApp.ts");
      $showInstallButton.set(true);
      disableInAppInstallPrompt();
      expect($showInstallButton.get()).toBe(false);
    });
  });

  describe("triggerPwaInstall", () => {
    it("does nothing when $installPrompt is null", async () => {
      const { $installPrompt, triggerPwaInstall } = await import("@stores/installApp.ts");
      const { trackEvent } = await import("@utils/analytics");
      $installPrompt.set(null);
      await triggerPwaInstall();
      expect(trackEvent).not.toHaveBeenCalled();
    });

    it("calls prompt() when $installPrompt is set", async () => {
      const { $installPrompt, $showInstallButton, triggerPwaInstall } = await import("@stores/installApp.ts");
      const promptMock = vi.fn().mockResolvedValue(undefined);
      $installPrompt.set({ prompt: promptMock } as unknown as Parameters<typeof $installPrompt.set>[0]);
      $showInstallButton.set(true);
      await triggerPwaInstall();
      expect(promptMock).toHaveBeenCalledOnce();
    });

    it("calls trackEvent after prompt", async () => {
      const { $installPrompt, triggerPwaInstall } = await import("@stores/installApp.ts");
      const { trackEvent } = await import("@utils/analytics");
      const promptMock = vi.fn().mockResolvedValue(undefined);
      $installPrompt.set({ prompt: promptMock } as unknown as Parameters<typeof $installPrompt.set>[0]);
      await triggerPwaInstall();
      expect(trackEvent).toHaveBeenCalledWith("App", "Clicked On Install Button", "PWA Prompt");
    });

    it("disables the prompt after calling it", async () => {
      const { $installPrompt, $showInstallButton, triggerPwaInstall } = await import("@stores/installApp.ts");
      const promptMock = vi.fn().mockResolvedValue(undefined);
      $installPrompt.set({ prompt: promptMock } as unknown as Parameters<typeof $installPrompt.set>[0]);
      $showInstallButton.set(true);
      await triggerPwaInstall();
      expect($installPrompt.get()).toBeNull();
      expect($showInstallButton.get()).toBe(false);
    });
  });
});
