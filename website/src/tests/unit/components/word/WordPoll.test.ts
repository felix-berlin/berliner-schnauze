import WordPoll from "@components/word/WordPoll.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { AGES } from "payload-app/word-feedback";
import { beforeEach, describe, expect, it, vi } from "vitest";

const online = vi.hoisted(() => ({ ref: undefined as undefined | { value: boolean } }));
vi.mock("@composables/useOnline.ts", async () => {
  const { ref } = await import("vue");
  online.ref = ref(true);
  return {
    OFFLINE_HINT: "Du bist offline. Abstimmen und Mitmachen jeht wieder, sobald du Netz hast.",
    useOnline: () => online.ref,
  };
});
const store = vi.hoisted(() => ({
  answerUsage: vi.fn(),
  loadFeedback: vi.fn(),
  sendFeedback: vi.fn(),
}));
vi.mock("@stores/wordFeedback.ts", async () => {
  const actual =
    await vi.importActual<typeof import("@stores/wordFeedback.ts")>("@stores/wordFeedback.ts");
  return { ...actual, ...store };
});
vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

import { $feedback, $profile, $sendError } from "@stores/wordFeedback.ts";

const OFFLINE = "Du bist offline. Abstimmen und Mitmachen jeht wieder, sobald du Netz hast.";
const DELETE_FAILED = "Löschen hat nich jeklappt. Versuch’s gleich nochmal.";

const group = (key: string, selbst: number, n = 20) => ({ key, n, selbst });
const result = (over: Record<string, unknown> = {}) => ({
  byAge: AGES.map((a, i) => group(a, 10 + i * 5)),
  byRegion: [group("ost", 74), group("west", 55), group("umland", 61)],
  matrix: [
    ...Array<string>(63).fill("say"),
    ...Array<string>(31).fill("know"),
    ...Array<string>(6).fill("never"),
  ],
  shares: { kenn: 31, nie: 6, selbst: 63 },
  total: 1285,
  ...over,
});
const mine = (over: Record<string, unknown> = {}) => ({
  age: null,
  area: null,
  half: null,
  locality: null,
  origin: null,
  reaction: null,
  usage: null,
  ...over,
});
const state = (m: ReturnType<typeof mine> | null, res = result()) =>
  ({
    compare: {},
    mine: m,
    result: res,
    totals: { dislike: 0, know: 0, like: 0, never: 0, say: 0 },
  }) as never;

type Route = (url: string, init?: RequestInit) => { body?: unknown; ok?: boolean };
let route: Route;
const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
  const r = route(url, init);
  return { json: async () => r.body ?? {}, ok: r.ok ?? true, status: r.ok === false ? 502 : 200 };
});

const mountIt = async (initial = result()) => {
  const w = mount(WordPoll, {
    attachTo: document.body,
    global: {
      stubs: {
        BerlinAreaMap: {
          emits: ["update:modelValue"],
          props: ["modelValue"],
          template:
            '<button type="button" class="map-stub" @click="$emit(\'update:modelValue\', \'pankow\')">map</button>',
        },
      },
    },
    props: { initial, label: "Schrippe", slug: "schrippe", wordId: 7 },
  });
  await flushPromises();
  return w;
};
type Wrapper = Awaited<ReturnType<typeof mountIt>>;
const button = (w: Wrapper, text: string) =>
  w.findAll("button").find((b) => b.text().includes(text))!;
const voted = { age: "30-39", area: "pankow", origin: "grewUp", usage: "say" };

describe("WordPoll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    online.ref!.value = true;
    $feedback.set(state(null));
    $profile.set({});
    $sendError.set(null);
    store.loadFeedback.mockImplementation(async () => {});
    store.answerUsage.mockResolvedValue(true);
    store.sendFeedback.mockResolvedValue(true);
    route = (url, init) => {
      if (init?.method === "DELETE") return { body: { deleted: true } };
      return { body: state(null) };
    };
    vi.stubGlobal("fetch", fetchMock);
  });

  describe("A: vote", () => {
    it("shows the three answers, the count and the teaser", async () => {
      const w = await mountIt();
      const text = w.text();
      for (const t of [
        "Sag ick selbst",
        "Kenn ick",
        "Nie jehört",
        "Is dit Wort bei dir noch im Einsatz?",
      ])
        expect(text).toContain(t);
      expect(text).toContain("1.285 Stimmen");
      expect(text).toContain("Schon 1.285 Stimmen – wat sagst du? Dit Ergebnis siehste danach.");
    });

    it("a click is the vote and leads to the questions with the thanks strip", async () => {
      store.answerUsage.mockImplementation(async () => {
        $feedback.set(state(mine({ usage: "say" })));
        return true;
      });
      const w = await mountIt();
      await button(w, "Sag ick selbst").trigger("click");
      await flushPromises();
      expect(store.answerUsage).toHaveBeenCalledWith(7, "say", true);
      expect(w.text()).toContain("Danke, deine Stimme is drin!");
      expect(w.text()).toContain("Wo wohnste?");
    });

    it("does not send twice while the first vote is pending", async () => {
      let done!: (v: boolean) => void;
      store.answerUsage.mockReturnValue(new Promise<boolean>((r) => (done = r)));
      const w = await mountIt();
      await button(w, "Kenn ick").trigger("click");
      await button(w, "Kenn ick").trigger("click");
      expect(store.answerUsage).toHaveBeenCalledTimes(1);
      expect(w.find('[role="group"]').attributes("aria-busy")).toBe("true");
      done(false);
      await flushPromises();
    });

    it("offline locks the vote, says why and sends nothing", async () => {
      online.ref!.value = false;
      const w = await mountIt();
      await flushPromises();
      const tile = button(w, "Sag ick selbst");
      expect(tile.attributes("aria-disabled")).toBe("true");
      expect(w.text()).toContain(OFFLINE);
      await tile.trigger("click");
      expect(store.answerUsage).not.toHaveBeenCalled();
    });

    it("a failed vote shows the strip and Nochmal versuchen sends the same answer", async () => {
      store.answerUsage.mockResolvedValueOnce(false);
      const w = await mountIt();
      await button(w, "Nie jehört").trigger("click");
      await flushPromises();
      expect(w.find('[role="alert"]').text()).toContain("Ditt hat nich jeklappt.");
      store.answerUsage.mockImplementation(async () => {
        $feedback.set(state(mine({ usage: "never" })));
        return true;
      });
      await button(w, "Nochmal versuchen").trigger("click");
      await flushPromises();
      expect(store.answerUsage).toHaveBeenLastCalledWith(7, "never", true);
    });
  });

  describe("B: questions", () => {
    const startB = async () => {
      store.answerUsage.mockImplementation(async () => {
        $feedback.set(state(mine({ usage: "say" })));
        return true;
      });
      const w = await mountIt();
      await button(w, "Sag ick selbst").trigger("click");
      await flushPromises();
      return w;
    };

    it("Ergebnis zeigen keeps the given answers", async () => {
      const w = await startB();
      await w.find(".map-stub").trigger("click");
      await flushPromises();
      expect(store.sendFeedback).toHaveBeenCalledTimes(1);
      await button(w, "Ergebnis zeigen").trigger("click");
      await flushPromises();
      expect(w.text()).toContain("Wat sagen alle?");
      expect(w.text()).toContain("Deine Angaben:");
      expect(w.text()).toContain("Pankow");
      // nothing was cleared on the way
      expect(store.sendFeedback).toHaveBeenCalledTimes(1);
    });

    it("skipping moves on without sending", async () => {
      const w = await startB();
      await button(w, "überspringen").trigger("click");
      await flushPromises();
      expect(store.sendFeedback).not.toHaveBeenCalled();
      expect(w.text()).toContain("Uffjewachsen oder zujezogen?");
    });

    it("follows the old skip rules: Brandenburg has no Kiez and no half", async () => {
      const w = await startB();
      store.sendFeedback.mockResolvedValue(true);
      // Pankow offers Kiez
      await w.find(".map-stub").trigger("click");
      await flushPromises();
      expect(w.text()).toContain("Welcher Kiez?");
    });

    it("a failed answer stays on the step and shows the strip", async () => {
      const w = await startB();
      store.sendFeedback.mockResolvedValue(false);
      $sendError.set("Jenug jestimmt für heute.");
      await w.find(".map-stub").trigger("click");
      await flushPromises();
      expect(w.text()).toContain("Wo wohnste?");
      expect(w.find('[role="alert"]').text()).toContain("Jenug jestimmt für heute.");
    });
  });

  describe("C: result", () => {
    const startC = async (res = result(), m = mine(voted)) => {
      $feedback.set(state(m, res));
      return mountIt(res);
    };

    it("is shown at once to a voter and has the legend as text", async () => {
      const w = await startC();
      expect(w.text()).toContain("Wat sagen alle?");
      expect(w.text()).toContain("Wer sagt’s noch?");
      expect(w.text()).toContain("63 %");
      expect(w.text()).toContain("deine Stimme");
      expect(w.text()).toContain("1 Punkt = 5 % · nur Gruppen ab 10 Stimmen");
    });

    it("draws 100 aria-hidden dots with one ringed own dot", async () => {
      const w = await startC();
      const matrix = w.find(".matrix");
      expect(matrix.attributes("aria-hidden")).toBe("true");
      expect(matrix.findAll(".dot")).toHaveLength(100);
      expect(matrix.findAll('.dot[data-own="true"]')).toHaveLength(1);
    });

    it("hides a region row under 10 votes", async () => {
      const w = await startC(
        result({ byRegion: [group("ost", 74, 40), group("west", 55, 9), group("umland", 61, 20)] }),
      );
      const rows = w.findAll("li").map((li) => li.text());
      expect(rows.some((t) => t.startsWith("Ost"))).toBe(true);
      expect(rows.some((t) => t.startsWith("Umland"))).toBe(true);
      expect(rows.some((t) => t.startsWith("West"))).toBe(false);
    });

    it("a row has 20 dots (1 dot = 5 %), round(pct / 5) of them filled", async () => {
      const w = await startC();
      const ost = w.findAll("li").find((li) => li.text().startsWith("Ost"))!;
      expect(ost.findAll(".dot")).toHaveLength(20);
      expect(ost.findAll('.dot[data-filled="true"]')).toHaveLength(15);
      expect(ost.find(".dots").attributes("aria-hidden")).toBe("true");
      expect(ost.text()).toContain("74 %");
    });

    it("renders all eight age rows", async () => {
      const w = await startC();
      const labels = ["unter 20", "20–29", "30–39", "40–49", "50–59", "60–69", "70–79", "80+"];
      const rows = w.findAll("ul[aria-labelledby] li").map((li) => li.text());
      for (const l of labels) expect(rows.some((t) => t.startsWith(l))).toBe(true);
      expect(w.findAll('ul[data-group="age"] li')).toHaveLength(8);
    });

    it("shows Deine Angaben and ändern returns to the questions prefilled", async () => {
      const w = await startC();
      expect(w.text()).toContain("Deine Angaben: Pankow · Hier uffjewachsen · 30–39");
      await button(w, "ändern").trigger("click");
      await flushPromises();
      expect(w.text()).toContain("Wo wohnste?");
      // walk to the origin step: the stored answer is pressed
      await button(w, "überspringen").trigger("click");
      await flushPromises();
      await button(w, "überspringen").trigger("click");
      await flushPromises();
      expect(w.text()).toContain("Uffjewachsen oder zujezogen?");
      expect(button(w, "Hier uffjewachsen").attributes("aria-pressed")).toBe("true");
    });

    it("without answers only the delete link shows", async () => {
      const w = await startC(result(), mine({ usage: "say" }));
      expect(w.text()).not.toContain("Deine Angaben:");
      expect(w.text()).toContain("Stimme und Angaben löschen");
    });
  });

  describe("delete", () => {
    const open = async () => {
      $feedback.set(state(mine(voted)));
      const w = await mountIt();
      const trigger = button(w, "Stimme und Angaben löschen");
      (trigger.element as HTMLElement).focus();
      await trigger.trigger("click");
      await flushPromises();
      return { trigger, w };
    };

    it("opens an alertdialog and puts the focus on Ja, löschen", async () => {
      const { w } = await open();
      const dialog = w.find('[role="alertdialog"]');
      expect(dialog.exists()).toBe(true);
      expect(dialog.text()).toContain(
        "Wirklich löschen? Deine Stimme und deine Angaben zu „Schrippe“ werden entfernt. Dit lässt sich nich rückgängig machen.",
      );
      expect(document.activeElement?.textContent).toContain("Ja, löschen");
    });

    it("Esc cancels and the focus returns to the trigger", async () => {
      const { trigger, w } = await open();
      await w.find('[role="alertdialog"]').trigger("keydown", { key: "Escape" });
      await flushPromises();
      expect(w.find('[role="alertdialog"]').exists()).toBe(false);
      expect(document.activeElement).toBe(trigger.element);
    });

    it("Abbrechen closes it and sends nothing", async () => {
      const { w } = await open();
      await button(w, "Abbrechen").trigger("click");
      expect(w.find('[role="alertdialog"]').exists()).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("Ja, löschen calls DELETE with the word id and returns to A with the status", async () => {
      const { w } = await open();
      route = (_url, init) =>
        init?.method === "DELETE" ? { body: { deleted: true } } : { body: state(null) };
      await button(w, "Ja, löschen").trigger("click");
      await flushPromises();
      const call = fetchMock.mock.calls.find(([, init]) => init?.method === "DELETE")!;
      expect(call[0]).toBe("/api/word-feedback?word=7");
      expect(w.find('[role="alertdialog"]').exists()).toBe(false);
      expect(w.text()).toContain("Is dit Wort bei dir noch im Einsatz?");
      expect(w.find('[role="status"]').text()).toContain("Jelöscht.");
      expect(w.text()).toContain("Deine Stimme und deine Angaben sind weg.");
    });

    it("a failed delete keeps the dialog and shows the error", async () => {
      const { w } = await open();
      route = (_url, init) => (init?.method === "DELETE" ? { ok: false } : { body: state(null) });
      await button(w, "Ja, löschen").trigger("click");
      await flushPromises();
      expect(w.find('[role="alertdialog"]').exists()).toBe(true);
      expect(w.text()).toContain(DELETE_FAILED);
      expect(w.text()).not.toContain("Jelöscht.");
    });

    it("sends the delete once on a double click while it is pending", async () => {
      const { w } = await open();
      let finish!: () => void;
      fetchMock.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = () => resolve({ json: async () => ({}), ok: true, status: 200 } as never);
          }),
      );
      const yes = button(w, "Ja, löschen");
      await yes.trigger("click");
      await yes.trigger("click");
      expect(fetchMock.mock.calls.filter(([, i]) => i?.method === "DELETE")).toHaveLength(1);
      expect(yes.attributes("aria-busy")).toBe("true");
      finish();
      await flushPromises();
    });
  });

  it("keeps its live regions in the DOM from the first render", async () => {
    const w = await mountIt();
    expect(w.findAll('[role="status"]').length).toBeGreaterThan(0);
    expect(w.findAll('[role="alert"]').length).toBeGreaterThan(0);
  });

  it("loads the own answers after hydration, never from props", async () => {
    await mountIt();
    expect(store.loadFeedback).toHaveBeenCalledWith(7);
  });
});
