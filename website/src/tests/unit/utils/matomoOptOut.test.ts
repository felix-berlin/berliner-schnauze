// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { initMatomoOptOut, isTracked, renderMatomoOptOut } from "../../../utils/matomoOptOut";

const clear = () =>
  document.cookie.split("; ").forEach((c) => {
    document.cookie = `${c.split("=")[0]}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  });

beforeEach(clear);

const change = (root: HTMLElement, checked: boolean) => {
  const box = root.querySelector("input") as HTMLInputElement;
  box.checked = checked;
  box.dispatchEvent(new Event("change"));
};

describe("matomo opt-out", () => {
  it("tracks by default and shows a checked box", () => {
    const root = document.createElement("div");
    renderMatomoOptOut(root);
    expect(isTracked()).toBe(true);
    expect(root.querySelector("input")?.checked).toBe(true);
    expect(root.textContent).toContain("wird aktuell von der Reichweitenmessung erfasst");
  });

  it("unchecking sets the cookie matomo.js honours, checking brings tracking back", () => {
    const root = document.createElement("div");
    renderMatomoOptOut(root);
    change(root, false);
    expect(document.cookie).toMatch(/mtm_consent_removed=\d+/);
    expect(isTracked()).toBe(false);
    expect(root.querySelector("input")?.checked).toBe(false);
    expect(root.textContent).toContain("Opt-out aktiv");
    expect(root.querySelectorAll("input")).toHaveLength(1);
    change(root, true);
    expect(isTracked()).toBe(true);
    expect(document.cookie).not.toContain("mtm_consent_removed");
  });

  it("says so when the browser does not keep the cookie", () => {
    const root = document.createElement("div");
    renderMatomoOptOut(root);
    const spy = vi.spyOn(document, "cookie", "set").mockImplementation(() => {});
    change(root, false);
    spy.mockRestore();
    expect(root.textContent).toContain("lässt das Speichern des Opt-outs nicht zu");
    expect(root.querySelector("input")?.checked).toBe(true);
  });

  it("does not throw when cookie access throws", () => {
    const get = vi.spyOn(document, "cookie", "get").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const root = document.createElement("div");
    expect(() => renderMatomoOptOut(root)).not.toThrow();
    get.mockRestore();
  });

  it("initMatomoOptOut draws the box and again after a page swap", () => {
    document.body.innerHTML = '<div id="matomo-opt-out"></div>';
    initMatomoOptOut();
    expect(document.querySelectorAll("#matomo-opt-out input")).toHaveLength(1);
    document.body.innerHTML = '<div id="matomo-opt-out"></div>';
    document.dispatchEvent(new Event("astro:page-load"));
    expect(document.querySelectorAll("#matomo-opt-out input")).toHaveLength(1);
  });
});
