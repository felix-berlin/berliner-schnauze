import FreshLists from "@components/home/FreshLists.vue";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";

// All data invented.
const ref = (n: number) => ({ berlinerisch: `Testwort ${n}`, slug: `testwort-${n}` });
const day = 86_400_000;
const newest = [1, 2, 3].map((n) => ({
  lemma: `Neuwort ${n}`,
  meaning: `Bedeutung ${n}`,
  publishedAt: new Date(Date.now() - n * 7 * day).toISOString(),
  slug: `neu-${n}`,
}));
const popular = [92, 63, null].map((sayShare, i) => ({ sayShare, views: 100 - i, word: ref(i) }));
// The second rising word has no meaning.
const rising = [
  { delta: 10, meaning: "Aufwind 1", word: ref(11) },
  { delta: 20, word: ref(12) },
  { delta: 30, meaning: "Aufwind 3", word: ref(13) },
];

const mountIt = (props: Partial<InstanceType<typeof FreshLists>["$props"]> = {}) =>
  mount(FreshLists, { attachTo: document.body, props: { newest, popular, rising, ...props } });

afterEach(() => {
  document.body.innerHTML = "";
});

describe("FreshLists", () => {
  it("lists the newest words with link, meaning and relative time", () => {
    const w = mountIt();
    const first = w.get('a[href="/wort/neu-1"]');
    expect(first.text()).toContain("Neuwort 1");
    expect(first.text()).toContain("Bedeutung 1");
    expect(first.text()).toContain("vor 1 Woche");
    expect(w.get('a[href="/wort"]').text()).toBe("Zum Wort-Index");
  });

  it("renders both panels, the inactive one hidden", () => {
    const w = mountIt();
    const panels = w.findAll('[role="tabpanel"]');
    expect(panels).toHaveLength(2);
    expect(panels[0]!.attributes("hidden")).toBeUndefined();
    expect(panels[1]!.attributes()).toHaveProperty("hidden");
    expect(panels[1]!.text()).toContain("+10");
    const risingRows = panels[1]!.findAll("li");
    expect(risingRows[0]!.text()).toContain("Aufwind 1");
    expect(risingRows[1]!.find("small").exists()).toBe(false);
    const tabs = w.findAll('[role="tab"]');
    expect(panels[0]!.attributes("aria-labelledby")).toBe(tabs[0]!.attributes("id"));
  });

  it("switches tabs with the arrow keys and keeps tabindex=-1 on the inactive tab", async () => {
    const w = mountIt();
    const tabs = () => w.findAll('[role="tab"]');
    expect(tabs().map((t) => t.attributes("tabindex"))).toEqual(["0", "-1"]);

    await tabs()[0]!.trigger("keydown", { key: "ArrowRight" });
    expect(tabs().map((t) => t.attributes("aria-selected"))).toEqual(["false", "true"]);
    expect(tabs().map((t) => t.attributes("tabindex"))).toEqual(["-1", "0"]);
    expect(document.activeElement).toBe(tabs()[1]!.element);
    expect(w.findAll('[role="tabpanel"]')[0]!.attributes()).toHaveProperty("hidden");

    await tabs()[1]!.trigger("keydown", { key: "ArrowRight" });
    expect(tabs()[0]!.attributes("aria-selected")).toBe("true");
    await tabs()[0]!.trigger("keydown", { key: "End" });
    expect(tabs()[1]!.attributes("aria-selected")).toBe("true");
    await tabs()[1]!.trigger("keydown", { key: "Home" });
    expect(tabs()[0]!.attributes("aria-selected")).toBe("true");
  });

  it("draws one dot per 10 % of sayShare and none without a share", () => {
    const w = mountIt();
    const rows = w.findAll('[role="tabpanel"]')[0]!.findAll("li");
    const dots = (i: number) => rows[i]!.findAll('[aria-hidden="true"] i');
    expect(dots(0)).toHaveLength(10);
    expect(dots(0).filter((d) => d.attributes("data-state") === "on")).toHaveLength(9);
    expect(dots(1).filter((d) => d.attributes("data-state") === "on")).toHaveLength(6);
    expect(rows[0]!.text()).toContain("92 %");
    expect(dots(2)).toHaveLength(0);
    expect(rows[2]!.text()).not.toContain("%");
  });

  it("drops a list with fewer than three entries and hides its tab", () => {
    const w = mountIt({ rising: rising.slice(0, 2) });
    expect(w.findAll('[role="tab"]')).toHaveLength(1);
    expect(w.findAll('[role="tabpanel"]')).toHaveLength(1);
    expect(w.text()).not.toContain("Im Aufwind");

    const short = mountIt({ newest: newest.slice(0, 2) });
    expect(short.text()).not.toContain("Neu im Wörterbuch");
  });

  it("drops the right column when both tabs are empty", () => {
    const w = mountIt({ popular: [], rising: [] });
    expect(w.find('[role="tablist"]').exists()).toBe(false);
    expect(w.text()).toContain("Neu im Wörterbuch");
  });
});
