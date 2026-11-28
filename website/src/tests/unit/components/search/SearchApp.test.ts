import SearchApp from "@components/search/SearchApp.vue";
import { showsLetterChip } from "@lib/search/state";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import { entry, meta, result, state } from "./fixtures";

const mocks = vi.hoisted(() => ({
  fetchSearchIndex: vi.fn(),
  getWordDb: vi.fn(),
  navigate: vi.fn(),
  runSearch: vi.fn(),
  scrollToIndex: vi.fn(),
  semanticCandidates: vi.fn(),
}));

vi.mock("virtua/vue", () => ({
  WindowVirtualizer: {
    methods: { findItemIndex: () => 0, scrollToIndex: mocks.scrollToIndex },
    props: ["data", "ssrCount", "as", "item"],
    template:
      '<div><template v-for="(d, i) in (data || [])" :key="i"><slot :item="d" :index="i" /></template></div>',
  },
}));
vi.mock("@services/wordSearchDb", () => ({ FULL_TEXT: {}, getWordDb: mocks.getWordDb }));
vi.mock("@services/searchIndex.ts", () => ({ fetchSearchIndex: mocks.fetchSearchIndex }));
vi.mock("@lib/search/run", () => ({
  runSearch: mocks.runSearch,
  semanticCandidates: mocks.semanticCandidates,
}));
vi.mock("astro:transitions/client", () => ({ navigate: mocks.navigate }));
vi.mock("@utils/reportError.ts", () => ({ reportError: vi.fn() }));

const deferred = <T>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, reject, resolve };
};

type Props = InstanceType<typeof SearchApp>["$props"];
const mountApp = (props: Partial<Props> = {}) =>
  mount(SearchApp, {
    attachTo: document.body,
    props: { meta, result: result(["Aalwurm", "Abendbrot"]), state: state(), ...props } as Props,
  });

const field = (w: ReturnType<typeof mountApp>) => w.get('input[role="combobox"]');
const ready = () => {
  mocks.getWordDb.mockResolvedValue({ db: {}, size: 1 });
  mocks.fetchSearchIndex.mockResolvedValue([]);
};
const metaLine = (w: ReturnType<typeof mountApp>) =>
  w.get("[data-meta]").text().replace(/\s+/g, " ");

beforeEach(() => {
  mocks.getWordDb.mockReturnValue(new Promise(() => {}));
  mocks.fetchSearchIndex.mockReturnValue(new Promise(() => {}));
  history.replaceState(null, "", "/wort");
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("SearchApp", () => {
  it("keeps ssr rows until index ready", async () => {
    vi.useFakeTimers();
    const db = deferred<{ db: object; size: number }>();
    const index = deferred<unknown[]>();
    mocks.getWordDb.mockReturnValue(db.promise);
    mocks.fetchSearchIndex.mockReturnValue(index.promise);
    mocks.runSearch.mockResolvedValue(result(["Quarkwolke"], { total: 1 }));
    const w = mountApp();

    await field(w).setValue("quark");
    await vi.advanceTimersByTimeAsync(200);
    expect(w.text()).toContain("Aalwurm");
    expect(w.text()).not.toContain("Keene Treffer");

    db.resolve({ db: {}, size: 1 });
    index.resolve([]);
    await vi.advanceTimersByTimeAsync(0);
    await flushPromises();
    expect(w.text()).toContain("Quarkwolke");
    expect(w.text()).not.toContain("Aalwurm");
  });

  it("arrow keys move aria-activedescendant and keep focus in the field", async () => {
    const w = mountApp();
    const input = field(w);
    (input.element as HTMLInputElement).focus();
    expect(input.attributes("aria-controls")).toBe("treffer");
    expect(w.get("#treffer").attributes("role")).toBe("listbox");

    await input.trigger("keydown", { key: "ArrowDown" });
    await flushPromises();
    expect(input.attributes("aria-activedescendant")).toBe("treffer-aalwurm");
    expect(w.get("#treffer-aalwurm").attributes("aria-selected")).toBe("true");

    await input.trigger("keydown", { key: "ArrowDown" });
    await flushPromises();
    expect(input.attributes("aria-activedescendant")).toBe("treffer-abendbrot");
    expect(mocks.scrollToIndex).toHaveBeenLastCalledWith(1, expect.anything());

    await input.trigger("keydown", { key: "ArrowUp" });
    await flushPromises();
    expect(input.attributes("aria-activedescendant")).toBe("treffer-aalwurm");
    expect(document.activeElement).toBe(input.element);
  });

  it("escape clears first, blurs second", async () => {
    const w = mountApp();
    const input = field(w);
    (input.element as HTMLInputElement).focus();
    await input.setValue("abc");

    await input.trigger("keydown", { key: "Escape" });
    expect((input.element as HTMLInputElement).value).toBe("");
    expect(document.activeElement).toBe(input.element);

    await input.trigger("keydown", { key: "Escape" });
    expect(document.activeElement).not.toBe(input.element);
  });

  it("slash focuses the field from anywhere", async () => {
    const w = mountApp();
    document.body.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "/" }));
    await nextTick();
    expect(document.activeElement).toBe(field(w).element);
  });

  describe("meta line texts", () => {
    it("counts all words without a query", () => {
      const w = mountApp({ result: result(["Aalwurm"], { total: 5928 }) });
      expect(metaLine(w)).toBe(`${(5928).toLocaleString("de")} Wörter`);
      expect(metaLine(w)).toBe("5.928 Wörter");
    });

    it("counts hits for a query", () => {
      const w = mountApp({ result: result(["Aalwurm"], { total: 7 }), state: state({ q: "aal" }) });
      expect(metaLine(w)).toBe("7 Treffer für „aal“");
    });

    it("says no hits for the query", () => {
      const w = mountApp({
        result: result([], { total: 0, unfiltered: 0 }),
        state: state({ q: "xyz" }),
      });
      expect(metaLine(w)).toBe("Keene Treffer für „xyz“");
    });

    it("blames the filters when they removed every hit", () => {
      const w = mountApp({
        result: result([], { total: 0, unfiltered: 3 }),
        state: state({ pos: ["Verb"], q: "aal" }),
      });
      expect(metaLine(w)).toBe("Keene Treffer mit diesen Filtern");
      expect(w.text()).toContain("Mit diesen Filtern: nüscht");
    });
  });

  it("register hides the Buchstabe chip only in the start state", () => {
    const start = mountApp();
    expect(start.find('nav[aria-label="Springen zu Buchstabe"]').exists()).toBe(true);
    const a = start.get('a[href="/wort?buchstabe=a"]');
    expect(a.text()).toBe("A, 2 Wörter"); // accessible name from the content (sr-only parts)
    expect(showsLetterChip(state())).toBe(false);

    const query = mountApp({ state: state({ q: "aal" }) });
    expect(query.find('nav[aria-label="Springen zu Buchstabe"]').exists()).toBe(false);
    expect(showsLetterChip(state({ q: "aal" }))).toBe(true);
    expect(showsLetterChip(state({ letter: "A" }))).toBe(true);
  });

  it("register jump without that letter's rows sets the letter filter in place", async () => {
    const w = mountApp({ state: state({ letter: "A" }) });
    await w.get('a[href="/wort?buchstabe=%C3%A4"]').trigger("click");
    // jsdom cannot navigate: only pushState (not location.assign) changes the url here.
    expect(decodeURIComponent(location.search)).toBe("?buchstabe=Ä");
  });

  it("letter heading counts one Wort, several Wörter", () => {
    const one = result(["Aalwurm"]);
    one.rows.unshift({ count: 1, kind: "letter", letter: "A" });
    expect(mountApp({ result: one }).get(".letter").text()).toBe("A1 Wort");
    const two = result(["Aalwurm", "Abendbrot"]);
    two.rows.unshift({ count: 2, kind: "letter", letter: "A" });
    expect(mountApp({ result: two }).get(".letter").text()).toBe("A2 Wörter");
  });

  it("index fetch fails → alert strip, retry refetches, ssr rows stay", async () => {
    mocks.fetchSearchIndex.mockRejectedValueOnce(new Error("offline"));
    mocks.getWordDb.mockRejectedValueOnce(new Error("offline"));
    const w = mountApp();
    await flushPromises();

    const alert = w.get('[role="alert"]');
    expect(alert.text()).toContain(
      "Ditt hat nich jeklappt. Die Suche is jerade nich erreichbar. Versuch’s gleich nochmal.",
    );
    expect(w.text()).toContain("Aalwurm");

    await alert.get("button").trigger("click");
    expect(mocks.fetchSearchIndex).toHaveBeenCalledTimes(2);
  });

  it("offline without a cached index shows the offline hint instead", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    mocks.fetchSearchIndex.mockRejectedValueOnce(new Error("offline"));
    mocks.getWordDb.mockRejectedValueOnce(new Error("offline"));
    const w = mountApp();
    await flushPromises();

    expect(w.find('[role="alert"]').exists()).toBe(false);
    expect(w.text()).toContain(
      "Du bist offline. Ick such nur in den Wörtern, die schon uff deinem Gerät sind.",
    );
    expect(w.text()).toContain("Aalwurm");
  });

  it("empty state links Wort vorschlagen and shows up to 3 Meinste pills", () => {
    const w = mountApp({
      result: result([], {
        suggestions: ["Aalwurm", "Aalquappe", "Aalfang"].map((x) => entry(x)),
        total: 0,
        unfiltered: 0,
      }),
      state: state({ q: "aalwurn" }),
    });
    expect(w.text()).toContain("Nüscht jefunden für „aalwurn“");
    expect(w.get('a[href^="/wort-vorschlagen"]').attributes("href")).toBe(
      "/wort-vorschlagen?wort=aalwurn",
    );
    expect(w.findAll('a[href^="/wort/"]').map((a) => a.text())).toEqual([
      "Aalwurm",
      "Aalquappe",
      "Aalfang",
    ]);
  });
  it("no skeleton while the index is cold: the server rows stand", async () => {
    vi.useFakeTimers();
    const w = mountApp();
    await field(w).setValue("quark");
    await vi.advanceTimersByTimeAsync(400);
    expect(w.text()).not.toContain("Suche läuft");
    expect(w.text()).toContain("Aalwurm");
  });

  it("a failing search run ends the wait and shows the alert strip", async () => {
    ready();
    mocks.runSearch
      .mockResolvedValueOnce(result(["Aalwurm"]))
      .mockRejectedValueOnce(new Error("x"));
    const w = mountApp();
    await flushPromises();
    await field(w).setValue("quark");
    await new Promise((r) => setTimeout(r, 200));
    await flushPromises();
    expect(w.find('[role="alert"]').exists()).toBe(true);
    expect(metaLine(w)).not.toContain("Suche läuft");
  });

  it("enter opens the active option through the router, without one it blurs", async () => {
    const w = mountApp();
    const input = field(w);
    (input.element as HTMLInputElement).focus();
    await input.trigger("keydown", { key: "Enter" });
    expect(document.activeElement).not.toBe(input.element);
    expect(mocks.navigate).not.toHaveBeenCalled();

    await input.trigger("keydown", { key: "ArrowDown" });
    await flushPromises();
    await input.trigger("keydown", { key: "Enter" });
    expect(mocks.navigate).toHaveBeenCalledWith("/wort/aalwurm");
  });

  it("the meta row's sort (tablet, SPEC §3.1) sets the sort like the bar's", async () => {
    history.replaceState(null, "", "/wort?q=aal");
    const w = mountApp({ state: state({ q: "aal" }) });
    const row = w.get("[data-meta]").element.parentElement!;
    const select = row.querySelector<HTMLSelectElement>('select[aria-label="Sortieren"]')!;
    select.value = "neu";
    select.dispatchEvent(new Event("change"));
    await flushPromises();
    expect(location.search).toBe("?q=aal&sort=neu");
  });

  it("Alles zurücksetzen keeps q", async () => {
    history.replaceState(null, "", "/wort?q=aal&wortart=verb&silben=2");
    const w = mountApp({ state: state({ pos: ["Verb"], q: "aal", syllables: 2 }) });
    await w
      .findAll("button")
      .find((b) => b.text() === "Alles zurücksetzen")!
      .trigger("click");
    expect(location.search).toBe("?q=aal");
    expect(w.find("button[aria-label^='Filter entfernen']").exists()).toBe(false);
  });

  it("removing the last active filter moves focus to the first chip, not body", async () => {
    history.replaceState(null, "", "/wort?q=aal&wortart=verb");
    const w = mountApp({ state: state({ pos: ["Verb"], q: "aal" }) });
    const pill = w.get('button[aria-label="Filter entfernen: Wortart Verb"]');
    (pill.element as HTMLElement).focus();
    await pill.trigger("click");
    await flushPromises();
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(w.get("button[popovertarget]").element);
    expect(document.activeElement?.textContent).toContain("Buchstabe");
  });

  it("Alle Filter zurücksetzen in the empty state moves focus to the first chip", async () => {
    history.replaceState(null, "", "/wort?q=aal&wortart=verb");
    const w = mountApp({
      result: result([], { total: 0, unfiltered: 3 }),
      state: state({ pos: ["Verb"], q: "aal" }),
    });
    const button = w.get(".c-search-empty button");
    (button.element as HTMLElement).focus();
    await button.trigger("click");
    await flushPromises();
    expect(document.activeElement).toBe(w.get("button[popovertarget]").element);
  });

  it("below 808px (bar hidden, no focus) reset focuses the mobile filter button", async () => {
    history.replaceState(null, "", "/wort?q=aal&wortart=verb");
    const w = mountApp({ state: state({ pos: ["Verb"], q: "aal" }) });
    // Stands in for display: none: the first chip refuses focus.
    (w.get("button[popovertarget]").element as HTMLButtonElement).disabled = true;
    const reset = w.findAll("button").find((b) => b.text() === "Alles zurücksetzen")!;
    (reset.element as HTMLElement).focus();
    await reset.trigger("click");
    await flushPromises();
    expect(document.activeElement).toBe(w.get('button[aria-haspopup="dialog"]').element);
  });

  it("a filter change pushes a router-shaped history entry (Back works after leaving)", async () => {
    history.replaceState({ index: 3, scrollX: 0, scrollY: 120 }, "", "/wort?wortart=verb&q=aal");
    const w = mountApp({
      result: result([], { total: 0, unfiltered: 3 }),
      state: state({ letter: "Z", pos: ["Verb"], q: "aal", syllables: 2 }),
    });
    const push = vi.spyOn(history, "pushState");
    await w.get(".c-search-empty button").trigger("click");
    expect(push).toHaveBeenCalledWith({ index: 4, scrollX: 0, scrollY: 0 }, "", "/wort?q=aal");
  });

  describe("meaning search", () => {
    const KI = '[aria-label="Nach Bedeutung suchen mit Chrome-KI"]';
    afterEach(() => vi.unstubAllGlobals());

    it("API missing renders nothing", async () => {
      const w = mountApp({ state: state({ q: "jemand ist lustig" }) });
      await flushPromises();
      expect(w.find(KI).exists()).toBe(false);
      expect(w.find(".c-semantic-search").exists()).toBe(false);
      expect(w.text()).not.toContain("nach Bedeutung");
    });

    it("unavailable renders nothing either", async () => {
      vi.stubGlobal("LanguageModel", { availability: async () => "unavailable" });
      const w = mountApp({ state: state({ q: "jemand ist lustig" }) });
      await flushPromises();
      expect(w.find(KI).exists()).toBe(false);
      expect(w.find(".c-semantic-search").exists()).toBe(false);
    });

    it("available: KI button, offer and Shift+Enter starts the meaning search", async () => {
      vi.stubGlobal("LanguageModel", {
        availability: async () => "downloadable",
        create: vi.fn(),
      });
      const w = mountApp({ state: state({ q: "jemand ist lustig" }) });
      await vi.waitFor(async () => {
        await flushPromises();
        expect(w.find(".c-semantic-search").exists()).toBe(true);
      });
      expect(w.find(KI).exists()).toBe(true);
      expect(w.text()).toContain("nach Bedeutung");
      expect(w.text()).toContain("Dit klingt nach ’ner Beschreibung");

      await field(w).trigger("keydown", { key: "Enter", shiftKey: true });
      await flushPromises();
      expect(w.text()).toContain("Einmal dit KI-Modell laden?");
    });

    it("arrow keys start in the KI result and run on into the keyword hits", async () => {
      const clone = {
        destroy: vi.fn(),
        prompt: async () => JSON.stringify({ slugs: ["quarkwolke"] }),
      };
      vi.stubGlobal("LanguageModel", {
        availability: async () => "available",
        create: async () => ({ clone: async () => clone, destroy: vi.fn() }),
      });
      Element.prototype.scrollIntoView = vi.fn(); // jsdom has none
      ready();
      mocks.runSearch.mockResolvedValue(result(["Aalwurm"]));
      mocks.semanticCandidates.mockResolvedValue([entry("Quarkwolke")]);
      const w = mountApp({ state: state({ q: "wat Weichet zum Kaffee" }) });
      const input = field(w);
      await vi.waitFor(async () => {
        await flushPromises();
        expect(w.find(".c-semantic-search").exists()).toBe(true);
      });
      await input.trigger("keydown", { key: "Enter", shiftKey: true });
      await vi.waitFor(async () => {
        await flushPromises();
        expect(w.text()).toContain("Passt vielleicht: 1 Wort nach Bedeutung");
      });
      expect(w.get(KI).attributes("aria-pressed")).toBe("true");

      await input.trigger("keydown", { key: "ArrowDown" });
      await flushPromises();
      expect(input.attributes("aria-activedescendant")).toBe("ki-quarkwolke");
      expect(w.get("#ki-quarkwolke").attributes("aria-selected")).toBe("true");
      await input.trigger("keydown", { key: "ArrowDown" });
      await flushPromises();
      expect(input.attributes("aria-activedescendant")).toBe("treffer-aalwurm");
      await input.trigger("keydown", { key: "ArrowDown" });
      await flushPromises();
      await input.trigger("keydown", { key: "Enter" });
      expect(mocks.navigate).toHaveBeenCalledWith("/wort/quarkwolke");
    });

    const available = () => {
      const clone = {
        destroy: vi.fn(),
        prompt: async () => JSON.stringify({ slugs: ["quarkwolke"] }),
      };
      vi.stubGlobal("LanguageModel", {
        availability: async () => "available",
        create: async () => ({ clone: async () => clone, destroy: vi.fn() }),
      });
    };
    const waitForBlock = (w: ReturnType<typeof mountApp>) =>
      vi.waitFor(async () => {
        await flushPromises();
        expect(w.find(".c-semantic-search").exists()).toBe(true);
      });

    it("Shift+Enter right after typing searches the typed query", async () => {
      available();
      ready();
      mocks.runSearch.mockResolvedValue(result(["Aalwurm"]));
      mocks.semanticCandidates.mockResolvedValue([entry("Quarkwolke")]);
      const w = mountApp({ state: state({ q: "aal" }) });
      await waitForBlock(w);
      await field(w).setValue("wat Weichet zum Kaffee");
      await field(w).trigger("keydown", { key: "Enter", shiftKey: true }); // before the 150 ms debounce
      await vi.waitFor(async () => {
        await flushPromises();
        expect(w.text()).toContain("Passt vielleicht");
      });
      expect(mocks.semanticCandidates).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ q: "wat Weichet zum Kaffee" }),
      );
    });

    it("index failed: the meaning search shows its error, not zu wenig", async () => {
      available();
      mocks.getWordDb.mockResolvedValue({ db: {}, size: 1 });
      mocks.fetchSearchIndex.mockRejectedValue(new Error("offline"));
      const w = mountApp({ state: state({ q: "wat Weichet zum Kaffee" }) });
      await waitForBlock(w);
      await field(w).trigger("keydown", { key: "Enter", shiftKey: true });
      await vi.waitFor(async () => {
        await flushPromises();
        expect(w.text()).toContain("Hat nich jeklappt");
      });
      expect(w.text()).not.toContain("Nüscht Passendet");
      expect(mocks.semanticCandidates).not.toHaveBeenCalled();
    });

    it("the KI list joins aria-controls while it is shown", async () => {
      available();
      ready();
      mocks.runSearch.mockResolvedValue(result(["Aalwurm"]));
      mocks.semanticCandidates.mockResolvedValue([entry("Quarkwolke")]);
      const w = mountApp({ state: state({ q: "wat Weichet zum Kaffee" }) });
      await waitForBlock(w);
      expect(field(w).attributes("aria-controls")).toBe("treffer");
      await field(w).trigger("keydown", { key: "Enter", shiftKey: true });
      await vi.waitFor(async () => {
        await flushPromises();
        expect(field(w).attributes("aria-controls")).toBe("ki-treffer treffer");
      });
      expect(w.get("#ki-treffer").attributes("role")).toBe("listbox");
    });
  });
});
