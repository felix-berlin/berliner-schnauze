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

// ─── isVueComponent ───────────────────────────────────────────────────────────

describe("isVueComponent", () => {
  it("returns false for null", async () => {
    const { isVueComponent } = await import("@stores/modal.ts");
    expect(isVueComponent(null)).toBe(false);
  });

  it("returns false for a string", async () => {
    const { isVueComponent } = await import("@stores/modal.ts");
    expect(isVueComponent("MyComponent")).toBe(false);
  });

  it("returns false for a number", async () => {
    const { isVueComponent } = await import("@stores/modal.ts");
    expect(isVueComponent(42)).toBe(false);
  });

  it("returns false for a plain object without render/setup", async () => {
    const { isVueComponent } = await import("@stores/modal.ts");
    expect(isVueComponent({ name: "test", props: {} })).toBe(false);
  });

  it("returns true for an object with a render function", async () => {
    const { isVueComponent } = await import("@stores/modal.ts");
    expect(isVueComponent({ render: () => null })).toBe(true);
  });

  it("returns true for an object with a setup function", async () => {
    const { isVueComponent } = await import("@stores/modal.ts");
    expect(isVueComponent({ setup: () => ({}) })).toBe(true);
  });
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

// ─── updateProps ──────────────────────────────────────────────────────────────

describe("updateProps", () => {
  it("merges new props with existing defaults", async () => {
    const { updateProps, $props } = await import("@stores/modal.ts");
    updateProps({ class: "c-my-modal", width: "600px" });
    expect($props.get().class).toBe("c-my-modal");
    expect($props.get().width).toBe("600px");
    // unchanged defaults stay intact
    expect($props.get().position).toBe("center");
  });

  it("can toggle closeOnClickOutside", async () => {
    const { updateProps, $props } = await import("@stores/modal.ts");
    updateProps({ closeOnClickOutside: false });
    expect($props.get().closeOnClickOutside).toBe(false);
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

  it("sets $viewIsComponent to true when view.component has a render fn", async () => {
    const { open, $viewIsComponent } = await import("@stores/modal.ts");
    open({ view: { component: { render: () => null } } });
    expect($viewIsComponent.get()).toBe(true);
  });

  it("sets $viewIsComponent to false for non-component view", async () => {
    const { open, $viewIsComponent } = await import("@stores/modal.ts");
    open({ view: { props: { foo: "bar" } } });
    expect($viewIsComponent.get()).toBe(false);
  });

  it("stores the onClose callback in $onCloseCallback", async () => {
    const { open, $onCloseCallback } = await import("@stores/modal.ts");
    const cb = vi.fn();
    open({}, cb);
    expect($onCloseCallback.get()).toBe(cb);
  });

  it("stores null when no callback is given", async () => {
    const { open, $onCloseCallback } = await import("@stores/modal.ts");
    open({});
    expect($onCloseCallback.get()).toBeNull();
  });
});

// ─── close ────────────────────────────────────────────────────────────────────

describe("close", () => {
  it("invokes the onClose callback then clears it", async () => {
    const { close, $onCloseCallback } = await import("@stores/modal.ts");
    const cb = vi.fn();
    $onCloseCallback.set(cb);
    close();
    expect(cb).toHaveBeenCalledOnce();
    expect($onCloseCallback.get()).toBeNull();
  });

  it("does not throw when no callback is set", async () => {
    const { close, $onCloseCallback } = await import("@stores/modal.ts");
    $onCloseCallback.set(null);
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
  it("resets $view, $props and $viewIsComponent after 500 ms", async () => {
    const { resetModal, $view, $props, $viewIsComponent } = await import("@stores/modal.ts");

    // put the store in a non-default state
    $view.set({ props: { foo: "bar" } });
    $viewIsComponent.set(true);

    resetModal();
    // state has not changed yet
    expect($view.get().props).toEqual({ foo: "bar" });

    vi.advanceTimersByTime(500);

    expect($view.get()).toEqual({});
    expect($viewIsComponent.get()).toBe(false);
    expect($props.get().class).toBe(""); // back to default
  });

  it("removes u-disable-scroll from body when disableScroll is true", async () => {
    const { resetModal, $props } = await import("@stores/modal.ts");
    document.body.classList.add("u-disable-scroll");
    $props.setKey("disableScroll", true);
    resetModal();
    expect(document.body.classList.contains("u-disable-scroll")).toBe(false);
  });
});
