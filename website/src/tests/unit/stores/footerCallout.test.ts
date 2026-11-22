import { $showAppCallout } from "@stores/footerCallout.ts";
import { $isPwaInstalled, $showInstallButton } from "@stores/installApp.ts";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

describe("$showAppCallout", () => {
  afterEach(() => {
    $showInstallButton.set(false);
    $isPwaInstalled.set(false);
  });

  it("is off until the browser offers the install prompt", () => {
    expect($showAppCallout.get()).toBe(false);
  });

  it("turns on when the app is installable", () => {
    $showInstallButton.set(true);
    expect($showAppCallout.get()).toBe(true);
  });

  it("stays off for an app that is already installed", () => {
    $showInstallButton.set(true);
    $isPwaInstalled.set(true);
    expect($showAppCallout.get()).toBe(false);
  });
});
