import { resolveFooterMode } from "@utils/footerMode.ts";
import { describe, expect, it } from "vitest";

describe("resolveFooterMode", () => {
  it("offers the app callout by default", () => {
    expect(resolveFooterMode(false, "app")).toBe("app");
  });

  it("shows only the sign when the page opts out of a callout", () => {
    expect(resolveFooterMode(false, "none")).toBe("sign");
  });

  it("lets a page's own callout slot win over both options", () => {
    expect(resolveFooterMode(true, "app")).toBe("callout");
    expect(resolveFooterMode(true, "none")).toBe("callout");
  });
});
