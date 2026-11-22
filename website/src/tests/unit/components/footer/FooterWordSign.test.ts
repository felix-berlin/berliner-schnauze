import type { FooterWord } from "@utils/footerWords.ts";

import FooterWordSign from "@components/footer/FooterWordSign.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

const word = (slug: string, over: Partial<FooterWord> = {}): FooterWord => ({
  example: `Beispiel ${slug}`,
  kind: "der",
  lemma: `Lemma ${slug}`,
  meaning: `Bedeutung ${slug}`,
  slug,
  ...over,
});
const words = ["a", "b", "c"].map((slug) => word(slug));

describe("FooterWordSign", () => {
  it("shows the first word: lemma as the only link, kind, meaning and example", () => {
    const wrapper = mount(FooterWordSign, { props: { words } });
    const links = wrapper.findAll("a");
    expect(links).toHaveLength(1);
    expect(links[0]!.text()).toBe("Lemma a");
    expect(links[0]!.attributes("href")).toBe("/wort/a");
    expect(wrapper.text()).toContain("der");
    expect(wrapper.text()).toContain("Bedeutung a");
    expect(wrapper.text()).toContain("Beispiel a");
    expect(wrapper.text()).toContain("Wort für unterwegs");
  });

  it("flags only long lemmas so they get the smaller fluid size", () => {
    const long = mount(FooterWordSign, {
      props: { words: [word("l", { lemma: "x".repeat(20) })] },
    });
    expect(long.get("a").attributes("data-long")).toBeDefined();
    expect(
      mount(FooterWordSign, { props: { words } }).get("a").attributes("data-long"),
    ).toBeUndefined();
  });

  it("is a polite live region", () => {
    expect(mount(FooterWordSign, { props: { words } }).attributes("aria-live")).toBe("polite");
  });

  it("leaves out the example and the kind when the word has none", () => {
    const wrapper = mount(FooterWordSign, {
      props: { words: [word("x", { example: null, kind: null })] },
    });
    expect(wrapper.text()).not.toContain("Beispiel");
    expect(wrapper.text()).not.toContain("null");
    expect(wrapper.text()).not.toContain("der");
    expect(wrapper.text()).not.toContain("„");
  });

  it("shows Noch eens only after hydration; the server render has it hidden", async () => {
    const html = await renderToString(createSSRApp({ render: () => h(FooterWordSign, { words }) }));
    expect(html).toMatch(/<button[^>]*hidden/);
    const wrapper = mount(FooterWordSign, { props: { words } });
    await flushPromises();
    expect(wrapper.find("button").attributes("hidden")).toBeUndefined();
  });

  it("swaps to another word, never repeating one before all were shown, and keeps focus on the button", async () => {
    const wrapper = mount(FooterWordSign, { attachTo: document.body, props: { words } });
    await flushPromises();
    const button = wrapper.get("button");
    (button.element as HTMLButtonElement).focus();
    const seen = [wrapper.get("a").text()];
    for (let i = 0; i < 2; i++) {
      await button.trigger("click");
      seen.push(wrapper.get("a").text());
      expect(document.activeElement).toBe(button.element);
    }
    expect(new Set(seen).size).toBe(3);
    wrapper.unmount();
  });

  it("has no Noch eens button for a single word", async () => {
    const wrapper = mount(FooterWordSign, { props: { words: [word("a")] } });
    await flushPromises();
    expect(wrapper.find("button").exists()).toBe(false);
    expect(wrapper.text()).toContain("Lemma a");
  });

  it("renders nothing for an empty list", () => {
    expect(mount(FooterWordSign, { props: { words: [] } }).html()).toBe("<!--v-if-->");
  });
});
