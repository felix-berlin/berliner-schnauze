// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import { isTracked, renderMatomoOptOut } from "../../../utils/matomoOptOut";

const clear = () =>
  document.cookie.split("; ").forEach((c) => {
    document.cookie = `${c.split("=")[0]}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  });

beforeEach(clear);

describe("matomo opt-out", () => {
  it("tracks by default and shows a checked box", () => {
    const root = document.createElement("div");
    renderMatomoOptOut(root);
    expect(isTracked()).toBe(true);
    expect(root.querySelector("input")?.checked).toBe(true);
  });

  it("unchecking sets the removed cookie that the tracker reads, checking brings tracking back", () => {
    const root = document.createElement("div");
    renderMatomoOptOut(root);
    const box = () => root.querySelector("input") as HTMLInputElement;
    box().checked = false;
    box().dispatchEvent(new Event("change"));
    expect(document.cookie).toContain("mtm_consent_removed=");
    expect(isTracked()).toBe(false);
    expect(box().checked).toBe(false);
    box().checked = true;
    box().dispatchEvent(new Event("change"));
    expect(isTracked()).toBe(true);
    expect(document.cookie).not.toContain("mtm_consent_removed=");
  });
});
