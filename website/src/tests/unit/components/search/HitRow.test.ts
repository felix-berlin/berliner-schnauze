import HitRow from "@components/search/HitRow.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import { hit } from "./fixtures";

vi.mock("@composables/useVoicePlayer.ts", () => ({
  isVoicePlaying: () => false,
  newVoiceKey: () => "voice-1",
  toggleVoice: vi.fn(),
}));

type Props = InstanceType<typeof HitRow>["$props"];
const row = (props: Partial<Props> = {}) =>
  mount(HitRow, {
    props: {
      active: false,
      hit: hit("Quarkwolke", 0, {
        article: "die",
        wordProperties: {
          ...hit("Quarkwolke").entry.wordProperties,
          translations: ["weiches Gebäck", "Wolke aus Quark"],
        },
      }),
      id: "treffer-quarkwolke",
      q: "",
      wotd: false,
      ...props,
    } as Props,
  });

describe("HitRow", () => {
  it("is an option that links the word", () => {
    const w = row({ active: true });
    expect(w.attributes("role")).toBe("option");
    expect(w.attributes("aria-selected")).toBe("true");
    expect(w.get("a").attributes("href")).toBe("/wort/quarkwolke");
    expect(w.text()).toContain("Quarkwolke, die");
  });

  it("separates meanings by a decorative circle plus a hidden ;", () => {
    const w = row();
    const meanings = w.get("[data-meanings]");
    expect(meanings.findAll('[aria-hidden="true"]')).toHaveLength(1);
    expect(meanings.get(".u-sr-only").text()).toBe(";");
    expect(meanings.text().replace(/\s+/g, " ")).toBe("weiches Gebäck; Wolke aus Quark");
  });

  it("marks the query in word and meanings from 3 letters", () => {
    expect(
      row({ q: "quark" })
        .findAll("mark")
        .map((m) => m.text()),
    ).toEqual(["Quark", "Quark"]);
    expect(row({ q: "qu" }).findAll("mark")).toHaveLength(0);
  });

  it("has no play button without audio, but keeps the slot", () => {
    const w = row();
    expect(w.find("button").exists()).toBe(false);
    expect(w.find('[data-play="empty"]').exists()).toBe(true);
  });

  it("names the play button {Wort} anhören", () => {
    const w = row({ hit: hit("Quarkwolke", 0, { audio: "https://example.test/a.mp3" }) });
    expect(w.get("button").attributes("aria-label")).toBe("Quarkwolke anhören");
    expect(w.get("button").attributes("aria-pressed")).toBe("false");
  });

  it("shows jesagt from 10 votes, zu wenig Stimmen below", () => {
    const many = row({ hit: hit("Quarkwolke", 0, { usage: { say: 0.63, votes: 40 } }) });
    expect(many.text()).toContain("jesagt");
    expect(many.text()).toContain("63 %");
    expect(many.get("[title]").attributes("title")).toBe("Anteil „Sag ick selbst“ in der Umfrage");

    const few = row({ hit: hit("Quarkwolke", 0, { usage: { say: 0.63, votes: 9 } }) });
    expect(few.text()).toContain("zu wenig Stimmen");
    expect(few.text()).not.toContain("63 %");
  });

  it("uses the share of the chosen Bezirk", () => {
    const w = row({
      hit: hit("Quarkwolke", 0, {
        usage: { areas: { mitte: { say: 0.2, votes: 12 } }, say: 0.63, votes: 40 },
      }),
      scope: { area: "mitte" },
    });
    expect(w.text()).toContain("20 %");
  });

  it("shows the Wort des Tages and Gerade beliebt badges", () => {
    const w = row({ trendRank: 3, wotd: true });
    expect(w.text()).toContain("Wort des Tages");
    expect(w.text()).toContain("Gerade beliebt");
    expect(row({ trendRank: 11 }).text()).not.toContain("Gerade beliebt");
  });
});
