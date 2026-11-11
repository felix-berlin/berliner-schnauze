import type { LeaderboardReply, PublicEntry } from "@services/bonLeaderboardApi";

import BonLeaderboard from "@components/games/BonLeaderboard.vue";
import { fetchLeaderboard, reportName } from "@services/bonLeaderboardApi";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const desktop = ref(true);
vi.mock("@vueuse/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@vueuse/core")>()),
  useMediaQuery: vi.fn(() => desktop),
}));
vi.mock("@services/bonLeaderboardApi", () => ({ fetchLeaderboard: vi.fn(), reportName: vi.fn() }));
vi.mock("@components/games/BonPlayerCode.vue", () => ({
  default: {
    emits: ["close"],
    name: "BonPlayerCode",
    props: ["mode"],
    template:
      "<section class='mock-code' :data-mode='mode'><button @click=\"$emit('close')\" /></section>",
  },
}));

const entry = (rank: number, extra: Partial<PublicEntry> = {}): PublicEntry => ({
  accuracy: 80,
  bestStreak: 6,
  finishedAt: new Date(Date.now() - 86_400_000 * 2).toISOString(),
  id: rank,
  name: `Spieler ${rank}`,
  rank,
  score: 1000 - rank * 10,
  ...extra,
});
const rows = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => entry(from + i));

const reply = (over: Partial<LeaderboardReply> = {}): LeaderboardReply => ({
  entries: rows(1, 25),
  total: 340,
  ...over,
});
const withMe = (rank = 40) =>
  reply({
    entries: Array.from({ length: 25 }, (_, i) =>
      entry(i + 1, i + 1 === rank ? { isMe: true } : {}),
    ),
    me: {
      accuracy: 82,
      around: [
        entry(rank - 2),
        entry(rank - 1),
        entry(rank, { isMe: true, name: "Ich" }),
        entry(rank + 1),
        entry(rank + 2),
      ],
      bestStreak: 6,
      rank,
      score: 600,
    },
  });

const fetchMock = vi.mocked(fetchLeaderboard);
const mountBoard = async (data: LeaderboardReply = reply()) => {
  fetchMock.mockResolvedValue(data);
  const wrapper = mount(BonLeaderboard, { attachTo: document.body });
  await flushPromises();
  return wrapper;
};

describe("BonLeaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    desktop.value = true;
    localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("renders the header with the week as default period", async () => {
    const w = await mountBoard();
    expect(w.find("a.c-textlink").text()).toBe("← Berliner oder nicht?");
    expect(w.find("a.c-textlink").attributes("href")).toBe("/games/berliner-oder-nicht");
    expect(w.find("h1.c-band").text()).toBe("Rangliste");
    expect(w.text()).toContain("340 Spiele · diese woche");
    const buttons = w.findAll(".c-choice");
    expect(buttons.map((b) => b.text())).toEqual(["Diese Woche", "Diesen Monat", "Allzeit"]);
    expect(buttons.map((b) => b.attributes("aria-pressed"))).toEqual(["true", "false", "false"]);
    expect(fetchMock).toHaveBeenCalledWith("week", 0, 25);
  });

  it("switching the period reloads from offset 0", async () => {
    const w = await mountBoard();
    await w.findAll(".c-choice")[1]!.trigger("click");
    await flushPromises();
    expect(fetchMock).toHaveBeenLastCalledWith("month", 0, 25);
    expect(w.findAll(".c-choice")[1]!.attributes("aria-pressed")).toBe("true");
    expect(w.find("ol").attributes("aria-label")).toBe("Rangliste Diesen Monat");
    expect(w.text()).toContain("diesen monat");
  });

  it("lists rows in an ol with a hidden place, accent for 1-3, the own row marked", async () => {
    const w = await mountBoard(withMe(2));
    expect(w.find("ol").attributes("aria-label")).toBe("Rangliste Diese Woche");
    const items = w.findAll("ol > li");
    expect(items).toHaveLength(25);
    expect(items[0]!.find(".u-sr-only").text()).toBe("Platz");
    expect(items[0]!.find(".c-bon-leaderboard__rank").classes()).toContain(
      "c-bon-leaderboard__rank--top",
    );
    expect(items[4]!.find(".c-bon-leaderboard__rank").classes()).not.toContain(
      "c-bon-leaderboard__rank--top",
    );
    const mine = w.find("[aria-current='true']");
    expect(mine.exists()).toBe(true);
    expect(mine.text()).toContain("du");
    expect(w.findAll("[aria-current='true']")).toHaveLength(1);
  });

  it("shows anonymous rows with their tag", async () => {
    const w = await mountBoard(reply({ entries: [entry(1, { name: "Anonym", tag: "K7QX" })] }));
    expect(w.find("ol").text()).toContain("Anonym");
    expect(w.find(".c-bon-leaderboard__tag").text()).toBe("#K7QX");
  });

  it("desktop: 25 rows plus the own row after a gap, the columns and the Dein-Platz card", async () => {
    const w = await mountBoard(withMe(40));
    expect(w.findAll("ol > li")).toHaveLength(25 + 1 + 3);
    expect(w.find("ol > li").text()).toContain("80 %");
    const card = w.find(".c-bon-leaderboard__aside");
    expect(card.text()).toContain("Dein Platz");
    expect(card.text()).toContain("40.");
    expect(card.text()).toContain("von 340 · besser als 88 %");
    expect(card.text()).toContain("600 Punkte");
    expect(card.text()).toContain("Erkannt wirst du an einem Cookie auf diesem Jerät.");
    const play = card.findAll("a").find((a) => a.text() === "Nochmal spielen");
    expect(play?.attributes("href")).toBe("/games/berliner-oder-nicht");
    expect(w.find(".c-bon-leaderboard__sticky").exists()).toBe(false);
  });

  it("mobile: top 10, a gap, the own row with one neighbour each side, and the fixed bar", async () => {
    desktop.value = false;
    const w = await mountBoard(withMe(40));
    const ranks = w
      .findAll("ol > li:not(.c-bon-leaderboard__gap) .c-bon-leaderboard__rank")
      .map((r) => r.text().replace("Platz", "").trim());
    expect(ranks).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "39", "40", "41"]);
    expect(w.find(".c-bon-leaderboard__gap").text()).toBe("···");
    const bar = w.find(".c-bon-leaderboard__sticky");
    expect(bar.text()).toContain("40.");
    expect(bar.text()).toContain("Du · 600 Punkte");
    expect(bar.text()).toContain("von 340 · besser als 88 %");
    await bar.find("button").trigger("click");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(w.text()).toContain("Platz 1–10 von 340");
  });

  it("mobile: no gap when the own row is right below the top 10", async () => {
    desktop.value = false;
    const w = await mountBoard(withMe(11));
    expect(w.find(".c-bon-leaderboard__gap").exists()).toBe(false);
  });

  it("Mehr laden appends the next 25", async () => {
    const w = await mountBoard();
    expect(w.text()).toContain("Platz 1–25 von 340");
    fetchMock.mockResolvedValue(reply({ entries: rows(26, 50) }));
    await w
      .findAll("button")
      .find((b) => b.text() === "Mehr laden")!
      .trigger("click");
    await flushPromises();
    expect(fetchMock).toHaveBeenLastCalledWith("week", 25, 25);
    expect(w.findAll("ol > li")).toHaveLength(50);
    expect(w.text()).toContain("Platz 1–50 von 340");
  });

  it("mobile: Mehr laden first shows the loaded rows, then fetches", async () => {
    desktop.value = false;
    const w = await mountBoard();
    await w
      .findAll("button")
      .find((b) => b.text() === "Mehr laden")!
      .trigger("click");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(w.text()).toContain("Platz 1–25 von 340");
  });

  it("report mode: Melden on foreign rows only, reports once and remembers it", async () => {
    vi.mocked(reportName).mockResolvedValue();
    const w = await mountBoard(withMe(2));
    expect(w.text()).toContain("Namen sind frei jewählt. Anstößige Namen blenden wa aus.");
    expect(w.findAll("ol button.c-textlink")).toHaveLength(0);
    await w
      .findAll("button")
      .find((b) => b.text() === "Namen melden")!
      .trigger("click");
    const buttons = w.findAll("ol button.c-textlink");
    expect(buttons).toHaveLength(24);
    await buttons[0]!.trigger("click");
    await flushPromises();
    expect(reportName).toHaveBeenCalledWith(1);
    expect(w.find("ol > li").text()).toContain("Jemeldet, danke!");
    expect(JSON.parse(localStorage.getItem("bs-reported-bon-names")!)).toEqual([1]);
    expect(w.findAll("ol button.c-textlink")).toHaveLength(23);
  });

  it("remembers reported names across mounts", async () => {
    localStorage.setItem("bs-reported-bon-names", "[3]");
    const w = await mountBoard();
    await w
      .findAll("button")
      .find((b) => b.text() === "Namen melden")!
      .trigger("click");
    expect(w.findAll("ol > li")[2]!.text()).toContain("Jemeldet, danke!");
  });

  it("a failed report shows an alert and keeps the button", async () => {
    vi.mocked(reportName).mockRejectedValue(
      new Error("Die Meldung konnte leider nich jesendet werden."),
    );
    const w = await mountBoard();
    await w
      .findAll("button")
      .find((b) => b.text() === "Namen melden")!
      .trigger("click");
    await w.findAll("ol button.c-textlink")[0]!.trigger("click");
    await flushPromises();
    expect(w.find("[role='alert']").text()).toContain("Meldung konnte leider nich");
    expect(w.findAll("ol button.c-textlink")).toHaveLength(25);
  });

  it("without a cookie: hint, play link, redeem opens BonPlayerCode and reloads on close", async () => {
    const w = await mountBoard();
    const aside = w.find(".c-bon-leaderboard__aside");
    expect(aside.text()).toContain("Du stehst hier noch nich drin.");
    expect(aside.find("a.c-button--primary").text()).toBe("Jetzt spielen");
    expect(aside.text()).toContain("Schon jespielt?");
    await aside
      .findAll("button")
      .find((b) => b.text() === "Spielercode einlösen")!
      .trigger("click");
    expect(w.find(".mock-code").attributes("data-mode")).toBe("redeem");
    fetchMock.mockClear();
    await w.find(".mock-code button").trigger("click");
    await flushPromises();
    expect(w.find(".mock-code").exists()).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith("week", 0, 25);
  });

  it("without a cookie on mobile the card sits above the list", async () => {
    desktop.value = false;
    const w = await mountBoard();
    expect(w.find(".c-bon-leaderboard__aside--first").exists()).toBe(true);
    expect(w.find(".c-bon-leaderboard__sticky").exists()).toBe(false);
  });

  it("empty: shows the text and Jetzt spielen", async () => {
    const w = await mountBoard(reply({ entries: [], total: 0 }));
    expect(w.text()).toContain("Diese Woche hat noch keener jespielt.");
    expect(w.text()).toContain("Hier könnte dein Name stehen.");
    expect(w.text()).toContain("Noch keene Spiele");
    expect(w.find("ol").exists()).toBe(false);
    expect(w.findAll("a.c-button--primary").some((a) => a.text() === "Jetzt spielen")).toBe(true);
  });

  it("loading: skeleton with 8 rows", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    const w = mount(BonLeaderboard);
    expect(w.findAll(".c-bon-leaderboard__skeleton-row")).toHaveLength(8);
    expect(w.find("[aria-busy='true']").exists()).toBe(true);
  });

  it("error: alert and retry", async () => {
    fetchMock.mockRejectedValueOnce(new Error("x"));
    const w = mount(BonLeaderboard);
    await flushPromises();
    expect(w.find("[role='alert']").text()).toContain("Die Rangliste is jerade nich zu kriegen.");
    fetchMock.mockResolvedValue(reply());
    await w
      .findAll("button")
      .find((b) => b.text() === "Nochmal versuchen")!
      .trigger("click");
    await flushPromises();
    expect(w.find("[role='alert']").exists()).toBe(false);
    expect(w.findAll("ol > li")).toHaveLength(25);
  });

  it("ignores a late reply of the period that was left", async () => {
    let resolveWeek: (r: LeaderboardReply) => void = () => {};
    fetchMock.mockReturnValueOnce(new Promise((r) => (resolveWeek = r)));
    const w = mount(BonLeaderboard);
    fetchMock.mockResolvedValueOnce(reply({ entries: [entry(1, { name: "Monat" })] }));
    await w.findAll(".c-choice")[1]!.trigger("click");
    await flushPromises();
    resolveWeek(reply({ entries: [entry(1, { name: "Woche" })] }));
    await flushPromises();
    expect(w.find("ol").text()).toContain("Monat");
  });
});
