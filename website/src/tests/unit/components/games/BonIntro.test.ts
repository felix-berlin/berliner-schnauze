import BonIntro from "@components/games/BonIntro.vue";
import { $bonStats } from "@stores/bonStats";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@components/games/BonPlayerCode.vue", () => ({
  default: {
    name: "BonPlayerCode",
    props: ["mode"],
    template: "<section class='mock-code' :data-mode='mode' />",
  },
}));

const mountIntro = (props: Partial<{ highScore: number; offline: boolean; linkRedeem: boolean }>) =>
  mount(BonIntro, { props: { highScore: 0, linkRedeem: false, offline: false, ...props } });

describe("BonIntro", () => {
  beforeEach(() => {
    $bonStats.setKey("playerName", "");
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
    expect(wrapper.emitted("start")).toEqual([["x".repeat(24)]]);
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
});
