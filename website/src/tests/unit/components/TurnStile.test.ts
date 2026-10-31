import TurnStile from "@components/TurnStile.vue";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

const turnstileScripts = () =>
  document.querySelectorAll('script[src*="challenges.cloudflare.com/turnstile"]');

afterEach(() => {
  vi.restoreAllMocks();
  window.turnstile = null;
  window.onloadTurnstileCallback = undefined;
  for (const script of turnstileScripts()) script.remove();
});

/** Mounts with a loaded Turnstile and returns the options the widget was rendered with. */
const renderOptions = () => {
  const render = vi.fn();
  window.turnstile = { render, reset: vi.fn() };
  const wrapper = mount(TurnStile, { props: { siteKey: "k", wrapperId: "tw" } });
  return { options: render.mock.calls[0][1], render, wrapper };
};

describe("TurnStile.vue", () => {
  it("renders its wrapper with the wrapperId", () => {
    const wrapper = mount(TurnStile, { props: { siteKey: "k", wrapperId: "testWrapperId" } });
    expect(wrapper.get("div#testWrapperId").exists()).toBe(true);
  });

  it("loads the script once and renders every waiting widget when it calls back", () => {
    const render = vi.fn();
    mount(TurnStile, { props: { siteKey: "k", wrapperId: "a" } });
    mount(TurnStile, { props: { siteKey: "k", wrapperId: "b" } });
    expect(turnstileScripts()).toHaveLength(1);

    window.turnstile = { render, reset: vi.fn() };
    window.onloadTurnstileCallback!();
    expect(render.mock.calls.map(([selector]) => selector)).toEqual(["#a", "#b"]);
  });

  it("skips a widget unmounted before the script arrived", () => {
    const render = vi.fn();
    mount(TurnStile, { props: { siteKey: "k" } }).unmount();
    window.turnstile = { render, reset: vi.fn() };
    window.onloadTurnstileCallback!();
    expect(render).not.toHaveBeenCalled();
  });

  it("emits an error when the script cannot load (blocker)", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = mount(TurnStile, { props: { siteKey: "k" } });
    turnstileScripts()[0]!.dispatchEvent(new Event("error"));
    expect(wrapper.emitted("error")).toEqual([["script-blocked"]]);
    expect(wrapper.emitted("token")).toEqual([[""]]);
  });

  it("renders right away when the script is already loaded (second visit), without a new script", () => {
    const { render } = renderOptions();
    expect(render).toHaveBeenCalledWith("#tw", expect.objectContaining({ sitekey: "k" }));
    expect(turnstileScripts()).toHaveLength(0);
  });

  it("emits the token, and an empty token once it expired or the challenge failed", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { options, wrapper } = renderOptions();
    options.callback("valid-token");
    options["expired-callback"]();
    options["error-callback"]("110200");
    expect(wrapper.emitted("token")).toEqual([["valid-token"], [""], [""]]);
    expect(wrapper.emitted("error")).toEqual([["110200"]]);
  });

  it("passes appearance to render, defaulting to always", () => {
    const render = vi.fn();
    window.turnstile = { render, reset: vi.fn() };
    mount(TurnStile, { props: { appearance: "interaction-only", siteKey: "k", wrapperId: "tw" } });
    expect(render.mock.calls[0][1]).toMatchObject({ appearance: "interaction-only" });

    const defaults = renderOptions();
    expect(defaults.options).toMatchObject({ appearance: "always" });
  });

  it('reset() resets its own widget id and emits ""', () => {
    const render = vi.fn(() => "widget-1");
    const reset = vi.fn();
    window.turnstile = { render, reset };
    const wrapper = mount(TurnStile, { props: { siteKey: "k", wrapperId: "tw" } });

    wrapper.vm.reset();
    expect(reset).toHaveBeenCalledWith("widget-1");
    expect(wrapper.emitted("token")).toEqual([[""]]);
  });

  it("emits nothing until Turnstile calls back", () => {
    const { wrapper } = renderOptions();
    expect(wrapper.emitted("token")).toBeUndefined();
  });

  it.each([
    [true, "dark"],
    [false, "light"],
  ])("follows dark mode (%s -> %s)", async (dark, theme) => {
    const { $isDarkMode } = await import("@stores/darkMode.ts");
    $isDarkMode.set(dark);
    expect(renderOptions().options).toMatchObject({ theme });
    $isDarkMode.set(false);
  });
});
