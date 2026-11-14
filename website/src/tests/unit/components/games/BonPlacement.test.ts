import type { PublicEntry } from "@services/bonLeaderboardApi";

import BonPlacement from "@components/games/BonPlacement.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

const entry = (rank: number, score: number, over: Partial<PublicEntry> = {}): PublicEntry => ({
  accuracy: 80,
  bestStreak: 5,
  finishedAt: "2026-11-10T10:00:00.000Z",
  id: rank,
  name: `Spieler ${rank}`,
  rank,
  score,
  tag: "ABCD",
  ...over,
});

const around = [
  entry(10, 400),
  entry(11, 380),
  entry(12, 350, { isMe: true, name: "Berta" }),
  entry(13, 300),
  entry(14, 290),
];

const place = (list: PublicEntry[] = around) => mount(BonPlacement, { props: { around: list } });

describe("BonPlacement", () => {
  it("lists the rows with the own one marked", () => {
    const wrapper = place();
    const rows = wrapper.findAll("li");
    expect(rows).toHaveLength(5);
    const mine = wrapper.findAll('[aria-current="true"]');
    expect(mine).toHaveLength(1);
    expect(mine[0].text()).toContain("Berta");
    expect(mine[0].text()).toContain("12");
    expect(mine[0].text()).toContain("350");
  });

  it("says how many points are missing to the place ahead", () => {
    expect(place().text()).toContain("Noch 31 Punkte bis Platz 11.");
  });

  it("uses the singular for a tie on points", () => {
    const list = [entry(2, 350), entry(3, 350, { isMe: true })];
    expect(place(list).text()).toContain("Noch 1 Punkt bis Platz 2.");
  });

  it("leaves the hint out at rank 1", () => {
    const list = [entry(1, 500, { isMe: true }), entry(2, 400), entry(3, 390)];
    const wrapper = place(list);
    expect(wrapper.text()).not.toContain("Noch ");
    expect(wrapper.findAll("li")).toHaveLength(3);
  });

  it("links to the whole leaderboard", () => {
    const link = place().find("a");
    expect(link.text()).toBe("Ganze Rangliste ansehen →");
    expect(link.attributes("href")).toBe("/games/berliner-oder-nicht/rangliste");
  });

  it("shows the tag next to the name", () => {
    expect(place().text()).toContain("#ABCD");
  });
});
