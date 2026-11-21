import type { HomeWord } from "@services/payload/home.ts";

import WordOfTheDayStage from "@components/home/WordOfTheDayStage.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import { vTooltip } from "@/directives/tooltip";

// Invented word.
const word: HomeWord = {
  article: "der",
  audioUrl: "/kiez.mp3",
  dateLabel: "Samstag, 21. November",
  example: {
    text: "In meen Kiez kennt jeder jeden.",
    translation: "In meinem Viertel kennt jeder jeden.",
  },
  ipa: "kiːts",
  lemma: "Kiez",
  meaning: "Viertel, Wohngegend",
  morse: [{ angle: 0, sym: "dot", x: 50, y: 5 }],
  slug: "kiez",
};

const stage = (over: Partial<HomeWord> = {}) =>
  mount(WordOfTheDayStage, {
    global: { directives: { tooltip: vTooltip } },
    props: { word: { ...word, ...over } },
  });

describe("WordOfTheDayStage", () => {
  it("labels the lemma h2 and hides the single letters", () => {
    const h2 = stage().get("h2");
    expect(h2.attributes("aria-label")).toBe("Kiez");
    const letters = h2.findAll("span");
    expect(letters.map((s) => s.text())).toEqual(["K", "i", "e", "z"]);
    expect(letters.every((s) => s.attributes("aria-hidden") === "true")).toBe(true);
  });

  it("shows eyebrow, date, article, meaning, example and the word link", () => {
    const w = stage();
    expect(w.text()).toContain("Wort des Tages");
    expect(w.text()).toContain("Samstag, 21. November");
    expect(w.text()).toContain(", der");
    expect(w.text()).toContain("Viertel, Wohngegend");
    expect(w.text()).toContain("„In meen Kiez kennt jeder jeden.“");
    expect(w.text()).toContain("In meinem Viertel kennt jeder jeden.");
    expect(w.get('a[href="/wort/kiez"]').text()).toContain("Zum Wort");
  });

  it("shows the no-audio pill only without audio", () => {
    expect(stage().text()).not.toContain("Noch keene Hörprobe.");
    const pill = stage({ audioUrl: undefined }).get("button.no-audio");
    expect(pill.text()).toContain("Noch keene Hörprobe.");
    expect(pill.text()).toContain("Sprichste „Kiez“ ein?");
  });

  it("renders the IPA outline aria-hidden only when the word has an IPA", () => {
    const outline = stage()
      .findAll('[aria-hidden="true"]')
      .find((e) => e.text() === "[kiːts]");
    expect(outline?.text()).toBe("[kiːts]");
    expect(stage({ ipa: undefined }).text()).not.toContain("[");
  });

  it("has no h1", () => {
    expect(stage().find("h1").exists()).toBe(false);
  });
});
