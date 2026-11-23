import { closeContributeForm, openContributeForm, openForm } from "@stores/contribute.ts";
import { beforeEach, describe, expect, it } from "vitest";

describe("contribute store", () => {
  beforeEach(() => openForm.set(null));

  it("opening a form replaces the open one", () => {
    openContributeForm("example");
    openContributeForm("fact");
    expect(openForm.get()).toBe("fact");
  });

  it("closing only affects the open form", () => {
    openContributeForm("fact");
    closeContributeForm("example");
    expect(openForm.get()).toBe("fact");
    closeContributeForm("fact");
    expect(openForm.get()).toBeNull();
  });
});
