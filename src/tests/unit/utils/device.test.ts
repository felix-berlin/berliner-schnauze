import { afterEach, describe, expect, it } from "vitest";
import { DeviceDetector } from "@utils/device";

const originalUA = navigator.userAgent;

function setUA(ua: string) {
  Object.defineProperty(navigator, "userAgent", {
    value: ua,
    writable: true,
    configurable: true,
  });
}

afterEach(() => {
  setUA(originalUA);
});

describe("DeviceDetector – desktop", () => {
  it("returns isDesktop:true for a Windows Chrome UA", () => {
    setUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124");
    const d = new DeviceDetector();
    expect(d.getDevice()).toEqual({ isDesktop: true, isMobile: false, isTablet: false });
  });

  it("returns isDesktop:true for a macOS Safari UA", () => {
    setUA("Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/605.1.15 Safari/605.1.15");
    const d = new DeviceDetector();
    expect(d.getDevice()).toEqual({ isDesktop: true, isMobile: false, isTablet: false });
  });

  it("stores userAgent on the instance", () => {
    const ua = "TestBrowser/2.0";
    setUA(ua);
    const d = new DeviceDetector();
    expect(d.userAgent).toBe(ua);
  });
});

describe("DeviceDetector – mobile", () => {
  it("detects iPhone as mobile (not tablet)", () => {
    setUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15");
    const d = new DeviceDetector();
    expect(d.getDevice()).toEqual({ isDesktop: false, isMobile: true, isTablet: false });
  });

  it("detects iPod as mobile (not tablet)", () => {
    setUA("Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15");
    const d = new DeviceDetector();
    expect(d.getDevice()).toEqual({ isDesktop: false, isMobile: true, isTablet: false });
  });

  it("detects BlackBerry as mobile (not tablet)", () => {
    setUA("Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en) AppleWebKit/534.11");
    const d = new DeviceDetector();
    expect(d.getDevice()).toEqual({ isDesktop: false, isMobile: true, isTablet: false });
  });

  it("detects IEMobile (Windows Phone) as mobile (not tablet)", () => {
    setUA(
      "Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0)",
    );
    const d = new DeviceDetector();
    expect(d.getDevice()).toEqual({ isDesktop: false, isMobile: true, isTablet: false });
  });

  it("detects Opera Mini as mobile (not tablet)", () => {
    setUA("Opera/9.80 (J2ME/MIDP; Opera Mini/5.0; U; en) Presto/2.4.15");
    const d = new DeviceDetector();
    expect(d.getDevice()).toEqual({ isDesktop: false, isMobile: true, isTablet: false });
  });

  it("detects webOS as mobile", () => {
    setUA("Mozilla/5.0 (webOS/1.4.0; U; en-US) AppleWebKit/532.2");
    const d = new DeviceDetector();
    expect(d.getDevice()).toEqual({ isDesktop: false, isMobile: true, isTablet: false });
  });
});

describe("DeviceDetector – tablet", () => {
  it("detects iPad as tablet (not mobile or desktop)", () => {
    setUA("Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15");
    const d = new DeviceDetector();
    expect(d.getDevice()).toEqual({ isDesktop: false, isMobile: false, isTablet: true });
  });

  it("detects Android UA as tablet (Android matches tabletRegex and overrides mobile)", () => {
    setUA(
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/112 Mobile Safari/537.36",
    );
    const d = new DeviceDetector();
    expect(d.getDevice()).toEqual({ isDesktop: false, isMobile: false, isTablet: true });
  });
});
