import AgeDots from "@components/home/AgeDots.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

// All data invented.
const byGroup = { "30-49": 8, "50-69": 22, "70plus": 67, u30: 3 };

describe("AgeDots", () => {
  it("names every group with its share", () => {
    const w = mount(AgeDots, { props: { byGroup, variant: "dying" } });
    expect(w.get('[role="img"]').attributes("aria-label")).toBe(
      "unter 30: 3 %, 30–49: 8 %, 50–69: 22 %, 70+: 67 %",
    );
  });

  it("draws four columns of ten dots, filled per 10 %", () => {
    const w = mount(AgeDots, { props: { byGroup, variant: "dying" } });
    const cols = w.get('[role="img"]').element.children;
    expect(cols).toHaveLength(4);
    const on = [...cols].map((c) => c.querySelectorAll('[data-state="on"]').length);
    expect(on).toEqual([0, 1, 2, 7]);
    expect([...cols].every((c) => c.children.length === 10)).toBe(true);
  });

  it("leaves a group below the vote threshold empty and says so", () => {
    const w = mount(AgeDots, {
      props: { byGroup: { ...byGroup, u30: null }, variant: "growing" },
    });
    expect(w.get('[role="img"]').attributes("aria-label")).toContain(
      "unter 30: noch zu wenig Stimmen",
    );
    expect(w.findAll('[data-state="on"]')).toHaveLength(10);
  });
});
