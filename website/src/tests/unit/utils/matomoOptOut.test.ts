// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { isTracked, OPT_OUT_COOKIE, renderMatomoOptOut } from "../../../utils/matomoOptOut";

const clear = () =>
  document.cookie.split("; ").forEach((c) => {
    document.cookie = `${c.split("=")[0]}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  });

beforeEach(() => {
  clear();
  delete (window as { _paq?: unknown })._paq;
});

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

  it("unchecking sets the opt-out cookie and stops a running tracker, checking brings tracking back", () => {
    const push = vi.fn();
    (window as { _paq?: unknown })._paq = { push };
    const root = document.createElement("div");
    renderMatomoOptOut(root);
    change(root, false);
    expect(document.cookie).toContain(`${OPT_OUT_COOKIE}=1`);
    expect(push).toHaveBeenCalledWith(["optUserOut"]);
    expect(isTracked()).toBe(false);
    expect(root.querySelector("input")?.checked).toBe(false);
    expect(root.textContent).toContain("Opt-out aktiv");
    expect(root.querySelectorAll("input")).toHaveLength(1);
    change(root, true);
    expect(isTracked()).toBe(true);
    expect(document.cookie).not.toContain(OPT_OUT_COOKIE);
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
});
