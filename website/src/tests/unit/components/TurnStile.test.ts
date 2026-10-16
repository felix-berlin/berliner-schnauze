import TurnStile from "@components/TurnStile.vue";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

const turnstileScripts = () =>
  document.querySelectorAll('script[src*="challenges.cloudflare.com/turnstile"]');

afterEach(() => {
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

  it("loads the script once and renders when it calls back", () => {
    const render = vi.fn();
    mount(TurnStile, { props: { siteKey: "k" } });
    mount(TurnStile, { props: { siteKey: "k" } });
    expect(turnstileScripts()).toHaveLength(1);

    window.turnstile = { render, reset: vi.fn() };
    window.onloadTurnstileCallback!();
    expect(render).toHaveBeenCalledOnce();
  });

  it("renders right away when the script is already loaded (second visit), without a new script", () => {
    const { render } = renderOptions();
    expect(render).toHaveBeenCalledWith("#tw", expect.objectContaining({ sitekey: "k" }));
    expect(turnstileScripts()).toHaveLength(0);
  });

  it("emits the token, and an empty token once it expired or the challenge failed", () => {
    const { options, wrapper } = renderOptions();
    options.callback("valid-token");
    options["expired-callback"]();
    options["error-callback"]();
    expect(wrapper.emitted("token")).toEqual([["valid-token"], [""], [""]]);
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
