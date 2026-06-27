import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import BonHUD from "@components/games/BonHUD.vue";


const defaultProps = {
  lives: 3,
  score: 0,
  streak: 0,
  multiplier: 1,
  isHighscore: false,
};

describe("BonHUD.vue", () => {
  it("renders the score", () => {
    const wrapper = mount(BonHUD, { props: { ...defaultProps, score: 42 } });
    expect(wrapper.find(".c-bon-hud__score").text()).toBe("42");
  });

  it("shows highscore class and sr-only text when isHighscore", () => {
    const wrapper = mount(BonHUD, { props: { ...defaultProps, isHighscore: true, score: 100 } });
    expect(wrapper.find(".c-bon-hud__score--highscore").exists()).toBe(true);
    expect(wrapper.find(".u-sr-only").text()).toContain("Neuer Highscore");
  });

  it("shows normal score sr-only text when not highscore", () => {
    const wrapper = mount(BonHUD, { props: { ...defaultProps, isHighscore: false, score: 5 } });
    expect(wrapper.find(".u-sr-only").text()).toContain("Score");
  });

  it("shows player name when provided", () => {
    const wrapper = mount(BonHUD, { props: { ...defaultProps, playerName: "Felix" } });
    expect(wrapper.find(".c-bon-hud__player").text()).toBe("Felix");
  });

  it("does not show player name element when not provided", () => {
    const wrapper = mount(BonHUD, { props: defaultProps });
    expect(wrapper.find(".c-bon-hud__player").exists()).toBe(false);
  });

  it("does not show streak when streak is 0", () => {
    const wrapper = mount(BonHUD, { props: { ...defaultProps, streak: 0 } });
    expect(wrapper.find(".c-bon-hud__streak").exists()).toBe(false);
  });

  it("shows streak count when streak > 0", () => {
    const wrapper = mount(BonHUD, { props: { ...defaultProps, streak: 5 } });
    expect(wrapper.find(".c-bon-hud__streak").exists()).toBe(true);
    expect(wrapper.find(".c-bon-hud__streak-count").text()).toContain("5");
  });

  it("shows multiplier badge when multiplier > 1", () => {
    const wrapper = mount(BonHUD, {
      props: { ...defaultProps, streak: 3, multiplier: 2 },
    });
    expect(wrapper.find(".c-bon-hud__multiplier-badge").text()).toContain("2×");
  });

  it("does not show multiplier badge when multiplier is 1", () => {
    const wrapper = mount(BonHUD, {
      props: { ...defaultProps, streak: 3, multiplier: 1 },
    });
    expect(wrapper.find(".c-bon-hud__multiplier").exists()).toBe(false);
  });

  it("lives aria-label reflects lives count", () => {
    const wrapper = mount(BonHUD, { props: { ...defaultProps, lives: 2 } });
    expect(wrapper.find(".c-bon-hud__lives").attributes("aria-label")).toContain("2");
  });
});
