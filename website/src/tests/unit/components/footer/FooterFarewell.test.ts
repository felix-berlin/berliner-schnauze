import type { FooterWord } from "@utils/footerWords.ts";

import FooterFarewell from "@components/footer/FooterFarewell.vue";
import { $showAppCallout } from "@stores/footerCallout.ts";
import { $isPwaInstalled, $showInstallButton } from "@stores/installApp.ts";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";

vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

const words: FooterWord[] = [
  { example: "Beispiel a", kind: "der", lemma: "Lemma a", meaning: "Bedeutung a", slug: "a" },
  { example: null, kind: null, lemma: "Lemma b", meaning: "Bedeutung b", slug: "b" },
];

const SIGN = "Wort für unterwegs";
const GOODBYE =
  "Nimm dir noch een Wort mit uff’n Heimweg. Beim nächsten Mal wartet hier een anderet.";
const WELCOME_BACK = "Schön, dass de da warst. Komm jut nach Hause.";

const BerlinerBaer = {
  props: ["mood", "size", "theme", "label", "disc"],
  template:
    '<svg data-testid="kalle" :data-mood="mood" :data-size="size" :data-theme="theme" :data-label="label" />',
};
const mountFarewell = (props: { mode: "sign" | "callout" | "app"; words?: FooterWord[] }) =>
  mount(FooterFarewell, {
    global: { stubs: { BerlinerBaer } },
    props: { words, ...props },
  });

// The root element's own tag: the real BerlinerBaer child renders its own data-state in SSR, only the root must not.
const rootTag = (html: string) => html.match(/^<[^>]+>/)?.[0] ?? "";

describe("FooterFarewell", () => {
  afterEach(() => {
    $showInstallButton.set(false);
    $isPwaInstalled.set(false);
  });

  it("says goodbye with the word sign in sign mode", () => {
    const text = mountFarewell({ mode: "sign" }).text();
    expect(text).toContain("Tschüssi, wa!");
    expect(text).toContain(GOODBYE);
    expect(text).toContain(SIGN);
    expect(text).toContain("Lemma a");
  });

  it("has no sign and another sentence when a callout is shown above", () => {
    const text = mountFarewell({ mode: "callout" }).text();
    expect(text).toContain(WELCOME_BACK);
    expect(text).not.toContain(GOODBYE);
    expect(text).not.toContain(SIGN);
  });

  it("falls back to the callout variant without words", () => {
    const text = mountFarewell({ mode: "sign", words: [] }).text();
    expect(text).toContain(WELCOME_BACK);
    expect(text).not.toContain(SIGN);
  });

  it("starts with the sign in app mode and gives way once the app can be installed", async () => {
    const wrapper = mountFarewell({ mode: "app" });
    expect(wrapper.text()).toContain(SIGN);
    $showInstallButton.set(true);
    await nextTick();
    expect($showAppCallout.get()).toBe(true);
    expect(wrapper.text()).not.toContain(SIGN);
    expect(wrapper.text()).toContain(WELCOME_BACK);
    $isPwaInstalled.set(true);
    await nextTick();
    expect(wrapper.text()).toContain(SIGN);
  });

  it("renders the sign on the server even when the app is already installable, so hydration matches", async () => {
    $showInstallButton.set(true);
    const html = await renderToString(
      createSSRApp({ render: () => h(FooterFarewell, { mode: "app", words }) }),
    );
    expect(html).toContain('data-variant="sign"');
    expect(html).toContain(SIGN);
    expect(rootTag(html)).not.toContain("data-state");
  });

  it("keeps the plain variant for a callout page and for app mode without words", async () => {
    $showInstallButton.set(true);
    expect(mountFarewell({ mode: "callout" }).attributes("data-variant")).toBe("plain");
    expect(mountFarewell({ mode: "app", words: [] }).attributes("data-variant")).toBe("plain");
  });

  it("arms the entry animation only after mount and sizes Kalle 150 on the server, 120 on a narrow screen", async () => {
    const html = await renderToString(
      createSSRApp({ render: () => h(FooterFarewell, { mode: "sign", words }) }),
    );
    expect(rootTag(html)).not.toContain("data-state");
    // The real BerlinerBaer (no stub in an SSR app) writes its size into the style.
    expect(html).toContain("width:150px");
    const wrapper = mountFarewell({ mode: "sign" });
    await nextTick();
    expect(wrapper.attributes("data-state")).toBe("armed");
    expect(wrapper.get('[data-testid="kalle"]').attributes("data-size")).toBe("120");
  });

  it("does not switch in sign mode when the app can be installed", async () => {
    const wrapper = mountFarewell({ mode: "sign" });
    $showInstallButton.set(true);
    await nextTick();
    expect(wrapper.text()).toContain(SIGN);
  });

  it("keeps Auf Wiedersehen out of the accessibility tree and Tschüssi, wa! out of the headings", () => {
    const wrapper = mountFarewell({ mode: "sign" });
    const hidden = wrapper.findAll('[aria-hidden="true"]').map((el) => el.text());
    expect(hidden).toContain("Auf Wiedersehen");
    expect(wrapper.find("h1, h2, h3, h4").exists()).toBe(false);
  });

  it("shows Kalle waving, dark and decorative", () => {
    const kalle = mountFarewell({ mode: "sign" }).get('[data-testid="kalle"]');
    expect(kalle.attributes("data-mood")).toBe("wave");
    expect(kalle.attributes("data-theme")).toBe("dark");
    expect(kalle.attributes("data-label")).toBeUndefined();
  });
});
