import type { RoundEntry } from "@composables/useBon";

import BonResult from "@components/games/BonResult.vue";
import { buildShareUrl } from "@utils/bonShare";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@components/games/BonPlayerCode.vue", () => ({
  default: { props: ["mode"], template: "<section class='mock-code' :data-mode='mode' />" },
}));

vi.mock("@utils/bonShare", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/bonShare")>()),
  buildShareUrl: vi.fn(() => "/games/berliner-oder-nicht/share?r=abc"),
}));

const entry = (over: Partial<RoundEntry>): RoundEntry => ({
  correct: true,
  isReal: true,
  multiplier: 1,
  points: 10,
  word: "Quatsch",
  ...over,
});

const history: RoundEntry[] = [
  entry({ slug: "quatsch", translation: "Unsinn", word: "Quatsch" }),
  entry({ category: "invented", correct: false, isReal: false, points: 0, word: "Flimmerkiste" }),
  entry({ category: "hochdeutsch", isReal: false, word: "Fernseher" }),
];

const props = {
  bestStreak: 3,
  endedEarly: false,
  history,
  playerName: "Berta",
  previousHighScore: 100,
  result: {
    bestStreak: 3,
    correctAnswers: 2,
    rank: 12,
    score: 150,
    totalAnswered: 3,
    totalGames: 400,
  },
  score: 150,
};

const mountResult = (over: Record<string, unknown> = {}) =>
  mount(BonResult, { attachTo: document.body, props: { ...props, ...over } });

enableAutoUnmount(afterEach);

describe("BonResult", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", { clipboard: undefined, share: undefined });
  });
  afterEach(() => vi.unstubAllGlobals());

  describe("head", () => {
    it("shows the record badge only for a score above the previous record", () => {
      expect(mountResult().find(".c-badge--strong").text()).toBe("Neuer Rekord!");
      expect(mountResult({ previousHighScore: 150 }).find(".c-badge--strong").exists()).toBe(false);
    });

    it("greets by name and falls back without one", () => {
      expect(mountResult().find("h1.c-band").text()).toBe("Aus die Maus, Berta!");
      expect(mountResult({ playerName: "" }).find("h1").text()).toBe("Aus die Maus!");
    });

    it("tells why the game ended", () => {
      expect(mountResult().text()).toContain("Drei Fehler – dit Spiel is vorbei.");
      expect(mountResult({ endedEarly: true }).text()).toContain("Du hast dit Spiel beendet.");
    });

    it("focuses the heading so the result is announced", async () => {
      const wrapper = mountResult();
      await flushPromises();
      expect(document.activeElement).toBe(wrapper.find("h1").element);
    });
  });

  describe("stats", () => {
    const stat = (wrapper: ReturnType<typeof mountResult>, label: string) =>
      wrapper.findAll(".c-bon-result__stat").find((s) => s.find("dt").text() === label)!;

    it("lists them in a dl", () => {
      expect(
        mountResult()
          .find("dl")
          .findAll("dt")
          .map((d) => d.text()),
      ).toEqual(["Punkte", "Platz", "Trefferquote", "Beste Serie"]);
    });

    it("shows rank and the share of games beaten", () => {
      const s = stat(mountResult(), "Platz");
      expect(s.find("dd").text()).toBe("12");
      expect(s.text()).toContain("von 400 Spielen · besser als 97 %");
    });

    it("falls back without a rank", () => {
      const s = stat(mountResult({ result: undefined }), "Platz");
      expect(s.find("dd").text()).toBe("–");
      expect(s.text()).toContain("Platzierung jerade nich da");
    });

    it("shows hit rate and best streak with its multiplier", () => {
      const wrapper = mountResult();
      expect(stat(wrapper, "Trefferquote").text()).toContain("67%");
      expect(stat(wrapper, "Trefferquote").text()).toContain("2 von 3 richtig");
      expect(stat(wrapper, "Beste Serie").text()).toContain("in Folge richtig · bis ×2");
    });
  });

  describe("share", () => {
    const text =
      "Ick hab 150 Punkte bei ‚Berliner oder nicht?‘ jeschafft – Platz 12. Schaffste mehr? ";

    it("uses navigator.share when there is one", async () => {
      const share = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", { share });
      await mountResult().find("button.c-choice").trigger("click");
      expect(share).toHaveBeenCalledOnce();
      expect(share.mock.calls[0][0].text).toBe(
        `${text}${window.location.origin}/games/berliner-oder-nicht/share?r=abc`,
      );
    });

    it("builds the share link with the cleaned name", async () => {
      vi.stubGlobal("navigator", { share: vi.fn().mockResolvedValue(undefined) });
      await mountResult({ playerName: "Heil Hitler" }).find("button.c-choice").trigger("click");
      expect(buildShareUrl).toHaveBeenLastCalledWith(expect.objectContaining({ playerName: "Anonym" }));
    });

    it("copies the text otherwise and says so", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", { clipboard: { writeText } });
      const wrapper = mountResult();
      const button = wrapper.find("button.c-choice");
      expect(button.text()).toBe("Ergebnis teilen");
      await button.trigger("click");
      await vi.waitFor(() => expect(button.text()).toBe("Text kopiert"));
      expect(writeText.mock.calls[0][0]).toContain(text);
    });

    it("leaves out the rank when there is none", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", { clipboard: { writeText } });
      await mountResult({ result: undefined }).find("button.c-choice").trigger("click");
      expect(writeText.mock.calls[0][0]).toContain("jeschafft. Schaffste mehr?");
    });
  });

  it("restarts from the primary button", async () => {
    const wrapper = mountResult();
    const button = wrapper.find("button.c-button--primary");
    expect(button.text()).toBe("Nochmal spielen");
    await button.trigger("click");
    expect(wrapper.emitted("restart")).toHaveLength(1);
  });

  it("shows the record on this device, never below the score", () => {
    expect(mountResult().text()).toContain(
      "Dein Rekord: 150 Punkte · gespeichert auf diesem Jerät",
    );
    expect(mountResult({ previousHighScore: 400 }).text()).toContain("Dein Rekord: 400 Punkte");
  });

  it("offers the code card in its Noch-kein-Code state, and no Hier stehste yet", () => {
    const wrapper = mountResult();
    expect(wrapper.find(".mock-code").attributes("data-mode")).toBeUndefined();
    expect(wrapper.text()).not.toContain("Hier stehste");
  });

  describe("Deine Runde", () => {
    const rows = (wrapper: ReturnType<typeof mountResult>) =>
      wrapper.findAll(".c-bon-result__round li");

    it("has one row per card in order, marked right or wrong", () => {
      const r = rows(mountResult());
      expect(r).toHaveLength(3);
      expect(r.map((x) => x.find("[role=img]").attributes("aria-label"))).toEqual([
        "richtig",
        "falsch",
        "richtig",
      ]);
      expect(r[0].text()).toContain("Quatsch");
      expect(r[0].text()).toContain("Unsinn");
    });

    it("links real words to their page", () => {
      const a = rows(mountResult())[0].find("a");
      expect(a.attributes("href")).toBe("/wort/quatsch");
      expect(a.text()).toContain("→");
    });

    it("strikes invented words and labels them, without a link", () => {
      const row = rows(mountResult())[1];
      expect(row.find("a").exists()).toBe(false);
      expect(row.find("s").text()).toBe("Flimmerkiste");
      expect(row.text()).toContain("erfunden");
    });

    it("labels Hochdeutsch words without strike or link", () => {
      const row = rows(mountResult())[2];
      expect(row.find("a").exists()).toBe(false);
      expect(row.find("s").exists()).toBe(false);
      expect(row.text()).toContain("Hochdeutsch");
    });

    it("links to the word index", () => {
      const a = mountResult().find(".c-section-card__footer a");
      expect(a.text()).toBe("Alle Wörter im Wort-Index");
      expect(a.attributes("href")).toBe("/");
    });
  });
});
