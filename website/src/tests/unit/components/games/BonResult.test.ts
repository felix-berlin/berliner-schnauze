import type { RoundEntry } from "@composables/useBon";

import BonResult from "@components/games/BonResult.vue";
import { fetchLeaderboard } from "@services/bonLeaderboardApi";
import { buildShareUrl } from "@utils/bonShare";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@components/games/BonPlayerCode.vue", () => ({
  default: { props: ["mode"], template: "<section class='mock-code' :data-mode='mode' />" },
}));

vi.mock("@services/bonLeaderboardApi", () => ({ fetchLeaderboard: vi.fn() }));
vi.mock("@components/games/BonPlacement.vue", () => ({
  default: {
    name: "BonPlacement",
    props: ["around"],
    template: "<section class='mock-placement'>{{ around.length }}</section>",
  },
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
    totalPlayers: 400,
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
      expect(mountResult().find(".c-badge[data-variant~='strong']").text()).toBe("Neuer Rekord!");
      expect(
        mountResult({ previousHighScore: 150 }).find(".c-badge[data-variant~='strong']").exists(),
      ).toBe(false);
    });

    it("greets by name and falls back without one", () => {
      expect(mountResult().find("h1.c-band").text()).toBe("Aus die Maus, Berta!");
      expect(mountResult({ playerName: "" }).find("h1").text()).toBe("Aus die Maus!");
      expect(mountResult({ playerName: "H1tler" }).find("h1").text()).toBe("Aus die Maus, Anonym!");
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

  describe("name", () => {
    it("shows the editor below the heading with the name and tag", () => {
      const wrapper = mountResult({ tag: "K7QX" });
      expect(wrapper.find(".c-bon-result__head .c-bon-name").text()).toContain(
        "Du spielst als Berta",
      );
      expect(wrapper.find("h1").text()).toContain("Berta");
    });

    it("offers Anonym for a nameless player, with the tag", () => {
      const wrapper = mountResult({ playerName: "", tag: "K7QX" });
      expect(wrapper.find(".c-bon-name").text()).toContain("Anonym");
      expect(wrapper.find(".c-bon-name").text()).toContain("#K7QX");
    });

    it("shows for a stored result without a rank, is missing when nothing was stored", () => {
      const wrapper = mountResult({ result: { ...props.result, rank: undefined } });
      expect(wrapper.find(".c-bon-name").exists()).toBe(true);
      expect(mountResult({ result: undefined }).find(".c-bon-name").exists()).toBe(false);
    });

    it("after saving, the heading shows the new name and the placement is fetched again", async () => {
      vi.mocked(fetchLeaderboard).mockResolvedValue({ entries: [], total: 0 });
      const wrapper = mountResult();
      await flushPromises();
      vi.mocked(fetchLeaderboard).mockClear();
      wrapper.findComponent({ name: "BonName" }).vm.$emit("saved", { name: "Kalle", tag: "K7QX" });
      await flushPromises();
      expect(wrapper.find("h1").text()).toContain("Kalle");
      expect(fetchLeaderboard).toHaveBeenCalledWith("week", 0, 0);
    });

    it("a late first placement reply does not win over the second", async () => {
      const mine = (name: string) => ({
        entries: [],
        me: { around: [{ isMe: true, name, rank: 12 }] },
        total: 400,
      });
      let late!: (v: unknown) => void;
      vi.mocked(fetchLeaderboard)
        .mockReturnValueOnce(new Promise((r) => (late = r)) as never)
        .mockResolvedValueOnce(mine("neu") as never);
      const wrapper = mountResult();
      const name = wrapper.findComponent({ name: "BonName" });
      name.vm.$emit("saved", { name: "alt" });
      name.vm.$emit("saved", { name: "neu" });
      await flushPromises();
      late(mine("alt"));
      await flushPromises();
      expect(wrapper.find(".mock-placement").exists()).toBe(true);
      expect(wrapper.findComponent({ name: "BonPlacement" }).props("around")[0].name).toBe("neu");
    });
  });

  describe("placement", () => {
    const around = [{ rank: 11 }, { isMe: true, rank: 12 }];

    it("shows the neighbours of the finish reply without asking the leaderboard", async () => {
      vi.mocked(fetchLeaderboard).mockClear();
      const wrapper = mountResult({ result: { ...props.result, around } as never });
      await flushPromises();
      expect(fetchLeaderboard).not.toHaveBeenCalled();
      expect(wrapper.find(".mock-placement").text()).toBe("2");
    });

    it("a retried save brings the neighbours later", async () => {
      const wrapper = mountResult({ result: undefined });
      expect(wrapper.find(".mock-placement").exists()).toBe(false);
      await wrapper.setProps({ result: { ...props.result, around } as never });
      expect(wrapper.find(".mock-placement").text()).toBe("2");
    });

    it("is missing without a rank, and does not ask", async () => {
      vi.mocked(fetchLeaderboard).mockClear();
      const wrapper = mountResult({ result: undefined });
      await flushPromises();
      expect(fetchLeaderboard).not.toHaveBeenCalled();
      expect(wrapper.find(".mock-placement").exists()).toBe(false);
    });

    it("is missing without an own row, and a failed refresh after a rename keeps it", async () => {
      expect(
        mountResult({ result: { ...props.result, around: [{ rank: 11 }] } as never })
          .find(".mock-placement")
          .exists(),
      ).toBe(false);
      vi.mocked(fetchLeaderboard).mockRejectedValueOnce(new Error("down"));
      const wrapper = mountResult({ result: { ...props.result, around } as never });
      wrapper.findComponent({ name: "BonName" }).vm.$emit("saved", { name: "Kalle" });
      await flushPromises();
      expect(wrapper.find(".mock-placement").text()).toBe("2");
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

    it("shows the week rank and the share of players beaten", () => {
      const s = stat(mountResult(), "Platz");
      expect(s.find("dd").text()).toBe("12");
      expect(s.text()).toContain("von 400 Spielern diese Woche · besser als 97 %");
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
      expect(buildShareUrl).toHaveBeenLastCalledWith(
        expect.objectContaining({ playerName: "Anonym" }),
      );
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

    it("says so when the clipboard is blocked, not when the share sheet is dismissed", async () => {
      vi.stubGlobal("navigator", {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new DOMException("no", "NotAllowedError")),
        },
      });
      const blocked = mountResult();
      await blocked.find("button.c-choice").trigger("click");
      await vi.waitFor(() => expect(blocked.find("[role=alert]").exists()).toBe(true));
      vi.stubGlobal("navigator", {
        share: vi.fn().mockRejectedValue(new DOMException("no", "AbortError")),
      });
      const dismissed = mountResult();
      await dismissed.find("button.c-choice").trigger("click");
      await flushPromises();
      expect(dismissed.find("[role=alert]").exists()).toBe(false);
    });

    it("leaves out the rank when there is none", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", { clipboard: { writeText } });
      await mountResult({ result: undefined }).find("button.c-choice").trigger("click");
      expect(writeText.mock.calls[0][0]).toContain("jeschafft. Schaffste mehr?");
    });
  });

  it("a failed save names the reason and offers a retry only when it can work", async () => {
    const retryable = mountResult({
      finishError: { message: "Dett Ergebnis konnte nich jespeichert werden.", retryable: true },
      result: undefined,
    });
    expect(retryable.text()).toContain(
      "Nich in der Rangliste: Dett Ergebnis konnte nich jespeichert werden.",
    );
    const button = retryable.findAll("button").find((b) => b.text() === "Nochmal speichern")!;
    await button.trigger("click");
    expect(retryable.emitted("retryFinish")).toHaveLength(1);

    const refused = mountResult({
      finishError: { message: "Ohne Cookie jibt's keen Ranking.", retryable: false },
      result: undefined,
    });
    expect(refused.text()).toContain("Ohne Cookie jibt's keen Ranking.");
    expect(refused.findAll("button").some((b) => b.text() === "Nochmal speichern")).toBe(false);
  });

  it("restarts from the primary button", async () => {
    const wrapper = mountResult();
    const button = wrapper.find("button.c-button[data-variant~='primary']");
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
      const a = mountResult()
        .findAll("a")
        .find((link) => link.text() === "Alle Wörter im Wort-Index");
      expect(a?.attributes("href")).toBe("/");
    });
  });
});
