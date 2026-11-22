import type { FooterWord } from "@utils/footerWords.ts";

import FooterFarewell from "@components/footer/FooterFarewell.vue";
import { $showAppCallout } from "@stores/footerCallout.ts";
import { $isPwaInstalled, $showInstallButton } from "@stores/installApp.ts";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

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
