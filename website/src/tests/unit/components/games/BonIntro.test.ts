import BonIntro from "@components/games/BonIntro.vue";
import { fetchPlayerName } from "@services/bonPlayerApi.ts";
import { $bonStats } from "@stores/bonStats";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@components/games/BonPlayerCode.vue", () => ({
  default: {
    name: "BonPlayerCode",
    props: ["mode"],
    template: "<section class='mock-code' :data-mode='mode' />",
  },
}));

vi.mock("@services/bonPlayerApi.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@services/bonPlayerApi.ts")>()),
  fetchPlayerName: vi.fn(),
}));

const mountIntro = (props: Partial<{ highScore: number; offline: boolean; linkRedeem: boolean }>) =>
  mount(BonIntro, { props: { highScore: 0, linkRedeem: false, offline: false, ...props } });

describe("BonIntro", () => {
  beforeEach(() => {
    $bonStats.setKey("playerName", "");
    vi.mocked(fetchPlayerName).mockReset().mockResolvedValue(undefined);
  });

  describe("known player", () => {
    it("replaces the field with the name editor and keeps the name for start", async () => {
      vi.mocked(fetchPlayerName).mockResolvedValue({ name: "Kalle" });
      const wrapper = mountIntro({});
      await flushPromises();
      expect(wrapper.find("#bon-name").exists()).toBe(false);
      expect(wrapper.text()).toContain("Du spielst als Kalle");
      expect($bonStats.get().playerName).toBe("Kalle");
      await wrapper.find("form").trigger("submit");
      expect(wrapper.emitted("start")).toEqual([[]]);
    });

    it("keeps the field for a first-time visitor", async () => {
      const wrapper = mountIntro({});
      await flushPromises();
      expect(wrapper.find("#bon-name").exists()).toBe(true);
      expect(wrapper.text()).toContain("Dein Name (optional)");
    });

    it("keeps the field without an error when the lookup fails", async () => {
      vi.mocked(fetchPlayerName).mockRejectedValue(new Error("down"));
      const wrapper = mountIntro({});
      await flushPromises();
      expect(wrapper.find("#bon-name").exists()).toBe(true);
      expect(wrapper.find("[role=alert]").exists()).toBe(false);
    });
  });

  it("renders title, name field, start button and rules", () => {
    $bonStats.setKey("playerName", "Berta");
    const wrapper = mountIntro({});
    expect(wrapper.find("h1.c-band").text()).toBe("Berliner oder nicht?");
    const input = wrapper.find("input");
    expect(input.attributes("maxlength")).toBe("24");
    expect(input.attributes("placeholder")).toBe("Anonym");
    expect((input.element as HTMLInputElement).value).toBe("Berta");
    expect(wrapper.find("button.c-button--primary").text()).toBe("Los jeht’s");
    expect(wrapper.text()).toContain("So jeht’s");
    expect(wrapper.text()).toContain("erfunden oder Hochdeutsch");
  });

  it("shows the record only above zero", () => {
    expect(mountIntro({}).text()).not.toContain("Dein Rekord");
    expect(mountIntro({ highScore: 210 }).text()).toContain("Dein Rekord: 210 Punkte");
  });

  it("stores the trimmed name (max 24) and emits start", async () => {
    const wrapper = mountIntro({});
    await wrapper.find("input").setValue(`  ${"x".repeat(30)}  `);
    await wrapper.find("form").trigger("submit");
    expect($bonStats.get().playerName).toBe("x".repeat(24));
    expect(wrapper.emitted("start")).toEqual([[]]);
  });

  it("far-right name: shows the alert with the EXIT-Deutschland link and stores nothing", async () => {
    const wrapper = mountIntro({});
    await wrapper.find("input").setValue("Nazi123");
    await wrapper.find("form").trigger("submit");
    const alert = wrapper.find("[role=alert]");
    expect(alert.text()).toContain("Rechtsextreme Namen jibt’s hier nich.");
    const link = alert.find("a.c-textlink");
    expect(link.attributes()).toMatchObject({
      href: "https://www.exit-deutschland.de/",
      rel: "noopener noreferrer",
      target: "_blank",
    });
    expect(link.text()).toBe("EXIT-Deutschland");
    expect(wrapper.find("input").attributes("aria-invalid")).toBe("true");
    expect(wrapper.find("input").attributes("aria-describedby")).toContain("bon-name-problem");
    expect($bonStats.get().playerName).toBe("");
    expect(wrapper.emitted("start")).toBeUndefined();
    await wrapper.find("input").setValue("Berta");
    expect(wrapper.find("[role=alert]").exists()).toBe(false);
  });

  it("insult: shows the short error and stores nothing", async () => {
    const wrapper = mountIntro({});
    await wrapper.find("input").setValue("Arschloch");
    await wrapper.find("form").trigger("submit");
    expect(wrapper.find("[role=alert]").text()).toBe(
      "Den Namen nehmen wir nich. Such dir ’n anderen aus.",
    );
    expect(wrapper.find("a[href*=exit-deutschland]").exists()).toBe(false);
    expect($bonStats.get().playerName).toBe("");
    expect(wrapper.emitted("start")).toBeUndefined();
  });

  it("a normal name is stored and started", async () => {
    const wrapper = mountIntro({});
    await wrapper.find("input").setValue("Marschall");
    await wrapper.find("form").trigger("submit");
    expect($bonStats.get().playerName).toBe("Marschall");
    expect(wrapper.emitted("start")).toEqual([[]]);
    expect(wrapper.find("[role=alert]").exists()).toBe(false);
  });

  it("offline: shows the notice and starts nothing", async () => {
    const wrapper = mountIntro({ offline: true });
    expect(wrapper.find(".c-state--offline").text()).toContain("Du bist offline.");
    const button = wrapper.find("button.c-button--primary");
    expect(button.attributes("aria-disabled")).toBe("true");
    await wrapper.find("form").trigger("submit");
    expect(wrapper.emitted("start")).toBeUndefined();
  });

  it("opens the player code in redeem mode in place", async () => {
    const wrapper = mountIntro({});
    expect(wrapper.find(".mock-code").exists()).toBe(false);
    await wrapper.find("button.c-textlink").trigger("click");
    expect(wrapper.find(".mock-code").attributes("data-mode")).toBe("redeem");
  });

  it("puts the code card first in the left column when opened from a link", () => {
    const wrapper = mountIntro({ linkRedeem: true });
    expect(wrapper.find(".c-bon-intro__main").element.firstElementChild?.className).toContain(
      "mock-code",
    );
    expect(wrapper.find("button.c-textlink").exists()).toBe(false);
  });

  it("links to the leaderboard", () => {
    const link = mountIntro({}).find("a.c-bon-intro__leaderboard");
    expect(link.text()).toBe("Rangliste");
    expect(link.attributes("href")).toBe("/games/berliner-oder-nicht/rangliste");
  });
});
