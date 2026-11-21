import { THEME_COLORS } from "@utils/themeColors";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInThisContext } from "node:vm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The inline script of SetColorMode.astro runs on every page, so test its real source.
const source = readFileSync(join(process.cwd(), "src/components/SetColorMode.astro"), "utf8");
const script = source
  .split("<script is:inline define:vars={{ THEME_COLORS }}>")[1]
  .split("</script>")[0];

describe("SetColorMode inline script", () => {
  let listener: (() => void) | undefined;
  let systemDark = false;

  const run = () => {
    Object.assign(globalThis, { THEME_COLORS });
    runInThisContext(`(() => {${script}})()`);
  };

  beforeEach(() => {
    listener = undefined;
    systemDark = false;
    localStorage.clear();
    document.head.innerHTML =
      '<meta name="theme-color" media="(prefers-color-scheme: light)" content="x">' +
      '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="y">';
    document.documentElement.className = "";
    document.documentElement.style.colorScheme = "";
    delete (window as unknown as { __schemeSync?: boolean }).__schemeSync;
    vi.stubGlobal("matchMedia", () => ({
      addEventListener: (_: string, cb: () => void) => (listener = cb),
      get matches() {
        return systemDark;
      },
    }));
    window.matchMedia = globalThis.matchMedia;
  });

  afterEach(() => vi.unstubAllGlobals());

  it("follows a system change while nothing is stored", () => {
    run();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    systemDark = true;
    listener!();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(document.querySelector("meta[name=theme-color]")?.getAttribute("content")).toBe(
      THEME_COLORS.dark,
    );
  });

  it("ignores a system change when a choice is stored", () => {
    localStorage.setItem("darkMode", "false");
    run();
    systemDark = true;
    listener!();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("replaces the media-scoped fallback metas with one resolved theme-color", () => {
    run();
    expect(document.querySelectorAll("meta[name=theme-color]").length).toBe(1);
    expect(document.querySelector("meta[name=theme-color][media]")).toBeNull();
  });
});
