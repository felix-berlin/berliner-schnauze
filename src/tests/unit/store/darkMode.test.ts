import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@nanostores/persistent", () => ({
  persistentAtom: vi.fn((key: string, initial: unknown) => {
    const { atom } = require("nanostores");
    return atom(initial);
  }),
}));

describe("darkMode store", () => {
  let metaThemeColor: HTMLMetaElement;

  beforeEach(() => {
    vi.resetModules();

    // Set up theme-color meta tag
    metaThemeColor = document.createElement("meta");
    metaThemeColor.name = "theme-color";
    document.head.appendChild(metaThemeColor);

    // Reset html class and colorScheme
    document.documentElement.className = "";
    document.documentElement.style.colorScheme = "";
  });

  afterEach(() => {
    metaThemeColor.remove();
  });

  it("setDarkMode(true) adds dark + cc--darkmode, sets colorScheme dark, sets dark meta", async () => {
    const { setDarkMode } = await import("@stores/darkMode.ts");
    setDarkMode(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("cc--darkmode")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(metaThemeColor.getAttribute("content")).toBe("#2b333b");
  });

  it("setDarkMode(false) removes dark + cc--darkmode, sets colorScheme light, sets light meta", async () => {
    const { setDarkMode } = await import("@stores/darkMode.ts");
    // first enable then disable
    setDarkMode(true);
    setDarkMode(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("cc--darkmode")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(metaThemeColor.getAttribute("content")).toBe("#fad0b0");
  });

  it("setDarkMode(null) with system dark preference resolves to dark", async () => {
    Object.defineProperty(global.window, "matchMedia", {
      value: vi.fn().mockReturnValue({ matches: true }),
      writable: true,
    });
    const { setDarkMode } = await import("@stores/darkMode.ts");
    setDarkMode(null);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("cc--darkmode")).toBe(true);
  });

  it("setDarkMode(null) with system light preference resolves to light", async () => {
    Object.defineProperty(global.window, "matchMedia", {
      value: vi.fn().mockReturnValue({ matches: false }),
      writable: true,
    });
    const { setDarkMode } = await import("@stores/darkMode.ts");
    setDarkMode(null);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("cc--darkmode")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("setDarkMode does not throw when meta[name=theme-color] is absent", async () => {
    metaThemeColor.remove();
    const { setDarkMode } = await import("@stores/darkMode.ts");
    expect(() => setDarkMode(true)).not.toThrow();
  });

  it("setDarkMode updates $isDarkMode atom", async () => {
    const { setDarkMode, $isDarkMode } = await import("@stores/darkMode.ts");
    setDarkMode(true);
    expect($isDarkMode.get()).toBe(true);
    setDarkMode(false);
    expect($isDarkMode.get()).toBe(false);
    setDarkMode(null);
    expect($isDarkMode.get()).toBeNull();
  });

  it("returns early without touching document when document is undefined", async () => {
    const { setDarkMode } = await import("@stores/darkMode.ts");
    const origDocument = global.document;
    // @ts-expect-error intentionally removing document
    delete global.document;
    expect(() => setDarkMode(true)).not.toThrow();
    global.document = origDocument;
  });
});
