import TurnStile from "@components/TurnStile.vue";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("TurnStile.vue", () => {
  it("renders the component", () => {
    const wrapper = mount(TurnStile, {
      props: {
        siteKey: "testSiteKey",
      },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it("applies the wrapperId prop to the div", () => {
    const wrapperId = "testWrapperId";
    const wrapper = mount(TurnStile, {
      props: {
        wrapperId,
        siteKey: "testSiteKey",
      },
    });
    expect(wrapper.get(`div#${wrapperId}`).exists()).toBe(true);
  });

  it("does not create a new script tag if window.turnstile is not null", () => {
    window.turnstile = {};
    const scriptTagCountBefore = document.getElementsByTagName("script").length;
    mount(TurnStile, {
      props: {
        siteKey: "testSiteKey",
      },
    });
    const scriptTagCountAfter = document.getElementsByTagName("script").length;
    expect(scriptTagCountAfter).toBe(scriptTagCountBefore);

    window.turnstile = null;
  });

  it("creates script tag when window.turnstile is exactly null (covers || left-side true short-circuit branch)", () => {
    (window as any).turnstile = null;
    const scriptsBefore = document.getElementsByTagName("script").length;
    mount(TurnStile, { props: { siteKey: "k" } });
    expect(document.getElementsByTagName("script").length).toBeGreaterThan(scriptsBefore);
  });
});

describe("TurnStile.vue — renderTurnstile callback (covers lines 49-50, 67)", () => {
  afterEach(() => {
    (window as any).turnstile = null;
    delete (window as any).onloadTurnstileCallback;
  });

  it("mount sets window.onloadTurnstileCallback", () => {
    (window as any).turnstile = { render: vi.fn() };
    mount(TurnStile, { props: { siteKey: "k" } });
    expect(typeof (window as any).onloadTurnstileCallback).toBe("function");
  });

  it("calling onloadTurnstileCallback invokes turnstile.render with correct selector (covers line 49)", () => {
    const mockRender = vi.fn();
    (window as any).turnstile = { render: mockRender };
    mount(TurnStile, { props: { siteKey: "site-key", wrapperId: "tw" } });
    (window as any).onloadTurnstileCallback();
    expect(mockRender).toHaveBeenCalledOnce();
    expect(mockRender.mock.calls[0][0]).toBe("#tw");
    expect(mockRender.mock.calls[0][1]).toMatchObject({ sitekey: "site-key" });
  });

  it("checkVerification returns true for non-empty response (covers line 67)", () => {
    let capturedCb: ((r: string) => void) | null = null;
    (window as any).turnstile = {
      render: vi.fn((_sel: string, opts: Record<string, unknown>) => {
        capturedCb = opts.callback as (r: string) => void;
      }),
    };
    const wrapper = mount(TurnStile, { props: { siteKey: "k" } });
    (window as any).onloadTurnstileCallback();
    capturedCb!("valid-token");
    expect(wrapper.emitted("verify")![0]).toEqual([true]);
  });

  it("checkVerification returns false for empty string response (covers line 67)", () => {
    let capturedCb: ((r: string) => void) | null = null;
    (window as any).turnstile = {
      render: vi.fn((_sel: string, opts: Record<string, unknown>) => {
        capturedCb = opts.callback as (r: string) => void;
      }),
    };
    const wrapper = mount(TurnStile, { props: { siteKey: "k" } });
    (window as any).onloadTurnstileCallback();
    capturedCb!("");
    expect(wrapper.emitted("verify")![0]).toEqual([false]);
  });

  it("onloadTurnstileCallback emits fail and expire events immediately on render (lines 51-52)", () => {
    (window as any).turnstile = { render: vi.fn() };
    const wrapper = mount(TurnStile, { props: { siteKey: "k" } });
    (window as any).onloadTurnstileCallback();
    expect(wrapper.emitted("fail")).toBeTruthy();
    expect(wrapper.emitted("expire")).toBeTruthy();
  });

  it("passes theme='dark' when isDarkMode store is true (covers line 54 dark branch)", async () => {
    const { $isDarkMode } = await import("@stores/darkMode.ts");
    $isDarkMode.set(true);
    const mockRender = vi.fn();
    (window as any).turnstile = { render: mockRender };
    mount(TurnStile, { props: { siteKey: "k" } });
    (window as any).onloadTurnstileCallback();
    expect(mockRender.mock.calls[0][1]).toMatchObject({ theme: "dark" });
    $isDarkMode.set(false);
  });
});
