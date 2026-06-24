import { $toastNotify, createToastNotify, removeToastById } from "@stores/toastNotify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const enablePopoverSupport = () => {
  Object.defineProperty(HTMLElement.prototype, "popover", {
    configurable: true,
    get() { return this.getAttribute("popover"); },
    set(v) { this.setAttribute("popover", v); },
  });
};

describe("createToastNotify", () => {
  beforeEach(() => {
    enablePopoverSupport();
    $toastNotify.set([]);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete (HTMLElement.prototype as { popover?: unknown }).popover;
  });

  it("returns false and does not add toast when popover API is unavailable", () => {
    delete (HTMLElement.prototype as { popover?: unknown }).popover;
    const result = createToastNotify({ message: "test" });
    expect(result).toBe(false);
    expect($toastNotify.get()).toHaveLength(0);
  });

  it("assigns a UUID string id", () => {
    createToastNotify({ message: "Hello" });
    const [toast] = $toastNotify.get();
    expect(typeof toast.id).toBe("string");
    expect(toast.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("prepends new toast (newest at index 0)", () => {
    createToastNotify({ message: "First" });
    createToastNotify({ message: "Second" });
    expect($toastNotify.get()[0].message).toBe("Second");
  });

  it("accepts top-center and bottom-center as valid positions", () => {
    createToastNotify({ message: "A", position: "top-center" });
    createToastNotify({ message: "B", position: "bottom-center" });
    const positions = $toastNotify.get().map((t) => t.position);
    expect(positions).toContain("top-center");
    expect(positions).toContain("bottom-center");
  });

  it("removes oldest toast of the position when MAX_PER_POSITION (3) is exceeded", () => {
    createToastNotify({ message: "A", position: "top-right" });
    createToastNotify({ message: "B", position: "top-right" });
    createToastNotify({ message: "C", position: "top-right" });
    createToastNotify({ message: "D", position: "top-right" });

    const forPos = $toastNotify.get().filter((t) => (t.position ?? "top-right") === "top-right");
    expect(forPos).toHaveLength(3);
    expect(forPos.map((t) => t.message)).not.toContain("A");
  });

  it("persists timeout: null on the toast so the component never auto-dismisses", () => {
    createToastNotify({ message: "Persistent", timeout: null });
    expect($toastNotify.get()[0].timeout).toBeNull();
  });

  it("applies a default 5000ms timeout when none is specified", () => {
    createToastNotify({ message: "Default" });
    expect($toastNotify.get()[0].timeout).toBe(5000);
  });

  it("does not remove toasts from other positions when one position is full", () => {
    createToastNotify({ message: "A", position: "top-right" });
    createToastNotify({ message: "B", position: "top-right" });
    createToastNotify({ message: "C", position: "top-right" });
    createToastNotify({ message: "Left", position: "top-left" });
    createToastNotify({ message: "D", position: "top-right" });

    expect($toastNotify.get().some((t) => t.message === "Left")).toBe(true);
  });
});

describe("removeToastById", () => {
  beforeEach(() => {
    enablePopoverSupport();
    $toastNotify.set([]);
  });

  it("removes the toast with the given id synchronously", () => {
    createToastNotify({ message: "Remove me", position: "top-right" });
    const id = $toastNotify.get()[0].id!;
    removeToastById(id);
    expect($toastNotify.get().find((t) => t.id === id)).toBeUndefined();
  });
});
