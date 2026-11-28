import QuickSearchPanel from "@components/search/QuickSearchPanel.vue";
import { resetQuickContext } from "@lib/search/quickContext";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { entry, hit, result } from "./fixtures";

const mocks = vi.hoisted(() => ({
  fetchSearchIndex: vi.fn(),
  getWordDb: vi.fn(),
  navigate: vi.fn(),
  runSearch: vi.fn(),
  setMatomoSearch: vi.fn(),
  toggleVoice: vi.fn(),
}));

vi.mock("@services/wordSearchDb", () => ({ FULL_TEXT: {}, getWordDb: mocks.getWordDb }));
vi.mock("@services/searchIndex.ts", () => ({ fetchSearchIndex: mocks.fetchSearchIndex }));
vi.mock("@lib/search/run", () => ({ runSearch: mocks.runSearch }));
vi.mock("astro:transitions/client", () => ({ navigate: mocks.navigate }));
vi.mock("@utils/reportError.ts", () => ({ reportError: vi.fn() }));
vi.mock("@utils/analytics", () => ({ setMatomoSearch: mocks.setMatomoSearch }));
vi.mock("@composables/useVoicePlayer.ts", () => ({
  isVoicePlaying: () => false,
  newVoiceKey: () => "voice-1",
  toggleVoice: mocks.toggleVoice,
}));

/** Invented words (SPEC §17). */
const ENTRIES = [
  entry("Quarkwolke", { article: "die", audio: "/media/quarkwolke.mp3" }),
  entry("Zwiebelturm"),
  entry("Pfannenwender"),
  entry("Kringelkram"),
];
const HISTORY_KEY = "schnellsuche-verlauf";

function stubFetch({ fail = false } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (fail) throw new Error("offline");
      if (url.startsWith("/api/word-of-the-day"))
        return Response.json({ berlinerisch: "Zwiebelturm", slug: "zwiebelturm" });
      if (url.startsWith("/api/trending"))
        return Response.json({
          items: [
            { rank: 1, word: { slug: "pfannenwender" } },
            { rank: 2, word: { slug: "kringelkram" } },
          ],
        });
      return new Response(null, { status: 404 });
    }),
  );
}

const mountPanel = (props: { open?: boolean; wide?: boolean } = {}) =>
  mount(QuickSearchPanel, { attachTo: document.body, props: { open: true, wide: true, ...props } });
type W = ReturnType<typeof mountPanel>;
const field = (w: W) => w.get('input[role="combobox"]');
const options = (w: W) => w.findAll('[role="option"]');
const key = (w: W, k: string, init: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: k, ...init });
  field(w).element.dispatchEvent(e);
  return e;
};
const settle = async (ms = 200) => {
  await vi.advanceTimersByTimeAsync(ms);
  await flushPromises();
};
const type = async (w: W, q: string) => {
  await field(w).setValue(q);
  await settle();
};

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  resetQuickContext();
  stubFetch();
  mocks.getWordDb.mockResolvedValue({ db: {}, size: 1 });
  mocks.fetchSearchIndex.mockResolvedValue(ENTRIES);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

describe("QuickSearchPanel: empty state (SPEC §21.1)", () => {
  it("shows history, Heute and Gerade beliebt; no row active until ↓", async () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(["quark", "kram", "turm", "wender"]));
    const w = mountPanel();
    await settle();

    const groups = w.findAll('[role="group"]').map((g) => g.attributes("aria-label"));
    expect(groups).toEqual(["Zuletzt jesucht", "Heute", "Gerade beliebt"]);
    expect(options(w).map((o) => o.text())).toEqual([
      expect.stringContaining("quark"),
      expect.stringContaining("kram"),
      expect.stringContaining("turm"),
      expect.stringContaining("Zwiebelturm"),
      expect.stringContaining("Pfannenwender"),
      expect.stringContaining("Kringelkram"),
    ]);
    // Badges on word rows: Wort des Tages on the wotd, Gerade beliebt on the trend rows.
    expect(options(w)[3]!.find('[aria-label="Wort des Tages"]').exists()).toBe(true);
    expect(options(w)[4]!.find('[aria-label="Gerade beliebt"]').exists()).toBe(true);
    expect(field(w).attributes("aria-activedescendant")).toBeUndefined();
    expect(options(w).every((o) => o.attributes("aria-selected") === "false")).toBe(true);

    key(w, "ArrowDown");
    await flushPromises();
    expect(field(w).attributes("aria-activedescendant")).toBe(options(w)[0]!.attributes("id"));
    expect(w.text()).toContain("Zufälliges Wort");
    expect(w.text()).toContain("Wort vorschlagen");
    expect(w.get('a[href="/wort"]').text()).toContain("Alle Wörter A–Z");
  });

  it("Del removes the active history entry, with the footer hint before", async () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(["quark", "kram"]));
    const w = mountPanel();
    await settle();
    expect(w.text()).not.toContain("aus Verlauf entfernen");

    key(w, "ArrowDown");
    await flushPromises();
    expect(w.text()).toContain("Entf aus Verlauf entfernen");
    expect(key(w, "Delete").defaultPrevented).toBe(true);
    await settle();
    expect(JSON.parse(localStorage.getItem(HISTORY_KEY)!)).toEqual(["kram"]);
    expect(field(w).attributes("aria-activedescendant")).toBeUndefined();
  });

  it("„Verlauf löschen“ empties the history; a history row fills the field", async () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(["quark", "kram"]));
    const w = mountPanel();
    await settle();
    await options(w)[1]!.trigger("click");
    expect((field(w).element as HTMLInputElement).value).toBe("kram");

    await field(w).setValue("");
    await settle();
    await w
      .findAll("button")
      .find((b) => b.text() === "Verlauf löschen")!
      .trigger("click");
    await settle();
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull();
    expect(w.find('[aria-label="Zuletzt jesucht"]').exists()).toBe(false);
  });

  it("failed wotd/trend requests just drop their groups", async () => {
    stubFetch({ fail: true });
    const w = mountPanel();
    await settle();
    expect(w.findAll('[role="group"]')).toHaveLength(0);
    expect(w.text()).toContain("Alle Wörter A–Z");
  });
});

describe("QuickSearchPanel: typing (SPEC §21.2, §23)", () => {
  const twoHits = () =>
    mocks.runSearch.mockResolvedValue(
      result([], {
        rows: [
          { hit: hit("Quarkwolke", 1, { audio: "/media/quarkwolke.mp3" }), kind: "hit" },
          { hit: hit("Zwiebelturm", 3), kind: "hit" },
        ],
        total: 2,
      }),
    );

  it("groups, the action row, first row active, marks and the live region", async () => {
    twoHits();
    const w = mountPanel();
    await settle();
    await type(w, "quark");

    expect(w.findAll('[role="group"]').map((g) => g.attributes("aria-label"))).toEqual([
      "Im Wort",
      "In der Bedeutung",
    ]);
    expect(options(w).at(-1)!.text()).toContain("Alle 2 Treffer anzeigen");
    expect(options(w).at(-1)!.text()).toContain("Mit Filtern und Sortierung");
    expect(field(w).attributes("aria-activedescendant")).toBe(options(w)[0]!.attributes("id"));
    expect(options(w)[0]!.find("mark").text()).toBe("Quark");
    expect(w.get('[aria-live="polite"]').text()).toBe("2 Treffer");
    // Key hints and the search page link once there is a query.
    expect(w.text()).toContain("navigieren");
    expect(w.text()).toContain("Strg");
    expect(
      w
        .findAll("a")
        .find((a) => a.text().includes("Zur Suchseite"))!
        .attributes("href"),
    ).toBe("/wort?q=quark");
    await settle(1500);
    expect(mocks.setMatomoSearch).toHaveBeenCalledWith("quark", "Word Search", 2);
  });

  it("no control inside an option; play plays and does not navigate", async () => {
    twoHits();
    const w = mountPanel();
    await settle();
    await type(w, "quark");

    for (const o of options(w))
      for (const el of o.findAll("button, a, input")) expect(el.attributes("tabindex")).toBe("-1");
    const play = options(w)[0]!.get('[title="Quarkwolke anhören"]');
    await play.trigger("click");
    expect(mocks.toggleVoice).toHaveBeenCalledWith("voice-1", "/media/quarkwolke.mp3");
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("Enter opens the active word, saves the query and closes", async () => {
    twoHits();
    const w = mountPanel();
    await settle();
    await type(w, "quark");

    key(w, "ArrowDown");
    expect(key(w, "Enter").defaultPrevented).toBe(true);
    expect(mocks.navigate).toHaveBeenCalledWith("/wort/zwiebelturm");
    expect(w.emitted("close")).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(HISTORY_KEY)!)).toEqual(["quark"]);
  });

  it("Ctrl/⌘+Enter and the „Alle … Treffer“ row go to the search page with q", async () => {
    twoHits();
    const w = mountPanel();
    await settle();
    await type(w, "quark");

    key(w, "Enter", { ctrlKey: true });
    expect(mocks.navigate).toHaveBeenLastCalledWith("/wort?q=quark");
    await options(w).at(-1)!.trigger("click");
    expect(mocks.navigate).toHaveBeenCalledTimes(2);
    expect(mocks.navigate).toHaveBeenLastCalledWith("/wort?q=quark");
  });

  it("Esc clears the field first, the second Esc is left to the dialog", async () => {
    twoHits();
    const w = mountPanel();
    await settle();
    await type(w, "quark");

    expect(key(w, "Escape").defaultPrevented).toBe(true);
    await flushPromises();
    expect((field(w).element as HTMLInputElement).value).toBe("");
    expect(key(w, "Escape").defaultPrevented).toBe(false);
    expect(w.emitted("close")).toBeUndefined();
  });

  it("nothing found: Kalle, copy and „Wort vorschlagen“; announces „Keene Treffer“", async () => {
    mocks.runSearch.mockResolvedValue(result([]));
    const w = mountPanel();
    await settle();
    await type(w, "xyzzy");

    expect(w.get("h2").text()).toBe("Nüscht jefunden für „xyzzy“");
    expect(w.text()).toContain("Weder im Wort noch in den Bedeutungen.");
    expect(options(w).map((o) => o.text())).toEqual([
      expect.stringContaining("Wort vorschlagen: „xyzzy“"),
    ]);
    expect(w.get('[aria-live="polite"]').text()).toBe("Keene Treffer");
    expect(w.text()).not.toContain("Nach Bedeutung"); // KI rows are Task 18
  });

  it("skeleton only after 300 ms while the index loads", async () => {
    mocks.getWordDb.mockReturnValue(new Promise(() => {}));
    const w = mountPanel();
    await field(w).setValue("quark");
    await settle(200);
    expect(w.find('[aria-label="Treffer werden jeladen"]').exists()).toBe(false);
    await settle(200);
    expect(w.find('[aria-label="Treffer werden jeladen"]').exists()).toBe(true);
    expect(w.text()).not.toContain("Keene Treffer");
  });

  it("old hits stay while the next answer is pending", async () => {
    twoHits();
    const w = mountPanel();
    await settle();
    await type(w, "quark");
    mocks.runSearch.mockReturnValue(new Promise(() => {}));
    await type(w, "quarkw");
    await settle(400);
    expect(w.text()).toContain("Quarkwolke");
    expect(w.find('[aria-label="Treffer werden jeladen"]').exists()).toBe(false);
  });

  it("reopening starts with an empty field", async () => {
    twoHits();
    const w = mountPanel();
    await settle();
    await type(w, "quark");
    await w.setProps({ open: false });
    await w.setProps({ open: true });
    await settle();
    expect((field(w).element as HTMLInputElement).value).toBe("");
    expect(w.text()).not.toContain("Quarkwolke");
  });

  it("mobile: Abbrechen instead of esc, short placeholder", async () => {
    const w = mountPanel({ wide: false });
    await settle();
    expect(field(w).attributes("placeholder")).toBe("Wort oder Bedeutung");
    await w
      .findAll("button")
      .find((b) => b.text() === "Abbrechen")!
      .trigger("click");
    expect(w.emitted("close")).toHaveLength(1);
    const desk = mountPanel();
    expect(field(desk).attributes("placeholder")).toBe("Such ’n Wort oder wat et bedeutet");
    expect(desk.findAll("button").some((b) => b.text() === "esc Schließen")).toBe(true);
  });
});
