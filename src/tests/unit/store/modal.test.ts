import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  document.body.className = "";
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ─── preventScroll ────────────────────────────────────────────────────────────

describe("preventScroll", () => {
  it("adds u-disable-scroll when status=true and disableScroll is enabled", async () => {
    const { preventScroll, $props } = await import("@stores/modal.ts");
    $props.setKey("disableScroll", true);
    preventScroll(true);
    expect(document.body.classList.contains("u-disable-scroll")).toBe(true);
  });

  it("removes u-disable-scroll when status=false", async () => {
    const { preventScroll, $props } = await import("@stores/modal.ts");
    document.body.classList.add("u-disable-scroll");
    $props.setKey("disableScroll", true);
    preventScroll(false);
    expect(document.body.classList.contains("u-disable-scroll")).toBe(false);
  });

  it("does not add the class when disableScroll is false", async () => {
    const { preventScroll, $props } = await import("@stores/modal.ts");
    $props.setKey("disableScroll", false);
    preventScroll(true);
    expect(document.body.classList.contains("u-disable-scroll")).toBe(false);
  });
});

// ─── open ─────────────────────────────────────────────────────────────────────

describe("open", () => {
  it("merges provided props into $props", async () => {
    const { open, $props } = await import("@stores/modal.ts");
    open({ props: { class: "c-test", width: "400px" } });
    expect($props.get().class).toBe("c-test");
    expect($props.get().width).toBe("400px");
  });

  it("stores view props in $view", async () => {
    const { open, $view } = await import("@stores/modal.ts");
    const viewProps = { title: "Hallo" };
    open({ view: { props: viewProps } });
    expect($view.get().props).toEqual(viewProps);
  });

  it("calls el.showModal() on the registered dialog element after nextTick", async () => {
    const { open, $element } = await import("@stores/modal.ts");
    const fakeDialog = { showModal: vi.fn() } as unknown as HTMLDialogElement;
    $element.set(fakeDialog);
    open({});
    await Promise.resolve();
    await Promise.resolve();
    expect(fakeDialog.showModal).toHaveBeenCalledOnce();
  });
});

// ─── close ────────────────────────────────────────────────────────────────────

describe("close", () => {
  it("does not throw when no dialog element is registered", async () => {
    const { close, $element } = await import("@stores/modal.ts");
    $element.set(null);
    expect(() => close()).not.toThrow();
  });

  it("calls el.close() when a dialog element is registered", async () => {
    const { close, $element } = await import("@stores/modal.ts");
    const fakeDialog = { close: vi.fn() } as unknown as HTMLDialogElement;
    $element.set(fakeDialog);
    close();
    expect(fakeDialog.close).toHaveBeenCalledOnce();
  });
});

// ─── resetModal ───────────────────────────────────────────────────────────────

describe("resetModal", () => {
  it("resets $view and $props after 500 ms", async () => {
    const { resetModal, $view, $props } = await import("@stores/modal.ts");

    // put the store in a non-default state
    $view.set({ props: { foo: "bar" } });

    resetModal();
    // state has not changed yet
    expect($view.get().props).toEqual({ foo: "bar" });

    vi.advanceTimersByTime(500);

    expect($view.get()).toEqual({});
    expect($props.get().class).toBe(""); // back to default
  });

  it("removes u-disable-scroll from body when disableScroll is true", async () => {
    const { resetModal, $props } = await import("@stores/modal.ts");
    document.body.classList.add("u-disable-scroll");
    $props.setKey("disableScroll", true);
    resetModal();
    expect(document.body.classList.contains("u-disable-scroll")).toBe(false);
  });

  it("does not call preventScroll when disableScroll is false", async () => {
    const { resetModal, $props } = await import("@stores/modal.ts");
    $props.setKey("disableScroll", false);
    document.body.classList.add("u-disable-scroll");
    resetModal();
    expect(document.body.classList.contains("u-disable-scroll")).toBe(true);
  });

  it("skips setTimeout when window is undefined", async () => {
    const { resetModal, $view } = await import("@stores/modal.ts");
    $view.set({ props: { foo: "bar" } });
    vi.stubGlobal("window", undefined);
    try {
      resetModal();
      vi.advanceTimersByTime(600);
      // Store was NOT reset because the setTimeout branch was skipped
      expect($view.get().props).toEqual({ foo: "bar" });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
