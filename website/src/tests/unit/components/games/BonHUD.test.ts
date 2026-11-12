import BonHUD from "@components/games/BonHUD.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

const base = { lives: 3, playerLabel: "Anonym", score: 0, streak: 0 };
const hud = (props: Partial<typeof base> = {}) => mount(BonHUD, { props: { ...base, ...props } });

describe("BonHUD.vue", () => {
  it("announces the lives as one image", () => {
    const wrapper = hud({ lives: 2 });
    const img = wrapper.find('[role="img"]');
    expect(img.attributes("aria-label")).toBe("Noch 2 Leben von 3");
    expect(img.findAll(".c-bon-hud__life")).toHaveLength(3);
    expect(img.findAll(".c-bon-hud__life--lost")).toHaveLength(1);
  });

  it("shows points and player in a polite live region", () => {
    const wrapper = hud({ playerLabel: "Berta", score: 42 });
    const live = wrapper.find('[aria-live="polite"]');
    expect(live.text()).toContain("42");
    expect(live.text()).toContain("Punkte · Berta");
  });

  it("shows the streak and what is missing to the next multiplier", () => {
    const wrapper = hud({ streak: 1 });
    expect(wrapper.text()).toContain("Serie 1");
    expect(wrapper.text()).toContain("noch 2 bis ×2");
    expect(hud({ streak: 4 }).text()).toContain("noch 2 bis ×3");
    expect(hud({ streak: 6 }).text()).toContain("noch 4 bis ×5");
  });

  it("says full throttle at ×5", () => {
    expect(hud({ streak: 12 }).text()).toContain("volle Pulle: ×5");
  });

  it("marks the current multiplier field and the reached ones", () => {
    const fields = hud({ streak: 7 }).findAll(".c-bon-hud__field");
    expect(fields.map((f) => f.text().split("·").pop()!.trim())).toEqual(["×1", "×2", "×3", "×5"]);
    expect(fields.map((f) => f.classes())).toEqual([
      expect.arrayContaining(["c-bon-hud__field--reached"]),
      expect.arrayContaining(["c-bon-hud__field--reached"]),
      expect.arrayContaining(["c-bon-hud__field--active"]),
      expect.not.arrayContaining(["c-bon-hud__field--reached", "c-bon-hud__field--active"]),
    ]);
  });
});
