import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { OramaSearchIndex } from "@/pages/api/search/index.json";

// Invented entries, real Orama on top of the mocked index fetch.
const entry = (slug: string, berlinerisch: string, translations: string[]): OramaSearchIndex => ({
  berlinerischWordTypes: [],
  dateTs: 0,
  modifiedTs: 0,
  slug,
  themen: [],
  wordComponents: [],
  wordGroup: berlinerisch[0]!.toUpperCase(),
  wordProperties: {
    audioBerlinerisch: false,
    audioExamples: false,
    berlinerisch,
    berolinismus: false,
    characterLength: berlinerisch.length,
    consonantsCount: 0,
    multipleMeanings: false,
    syllablesCount: 0,
    translations,
    vowelsCount: 0,
  },
});

const INDEX = [
  entry("kroemelkiste", "Krömelkiste", ["Brotkasten"]),
  entry("kroemelchen", "Krömelchen", ["Brösel"]),
  entry("schnuppel", "Schnuppel", ["kleines Gebäck"]),
  entry("knatterbeutel", "Knatterbeutel", ["Gebäcktüte"]),
  ...Array.from({ length: 8 }, (_, i) => entry(`zappel${i}`, `Zappel${i}`, ["Zappelei"])),
];

const fetchSearchIndex = vi.fn(() => Promise.resolve(INDEX));
vi.mock("@services/searchIndex.ts", () => ({ fetchSearchIndex }));

const navigate = vi.fn();
vi.mock("@utils/homeSearch.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/homeSearch.ts")>()),
  navigate,
}));

let wrapper: VueWrapper | undefined;

async function mountSearch() {
  // Fresh modules: the shared Orama DB is a module-level single-flight.
  const { default: HomeSearch } = await import("@components/home/HomeSearch.vue");
  wrapper = mount(HomeSearch, { attachTo: document.body });
  return wrapper;
}

const input = (w: VueWrapper) => w.get("input");

/** Focus, type a query and let the 150 ms debounce and the async search settle. */
async function type(w: VueWrapper, value: string) {
  (input(w).element as HTMLInputElement).focus();
  await input(w).setValue(value);
  await vi.advanceTimersByTimeAsync(150);
  await flushPromises();
  await vi.advanceTimersByTimeAsync(0);
  await flushPromises();
}

const options = (w: VueWrapper) => w.findAll('[role="option"]');

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  fetchSearchIndex.mockClear();
  navigate.mockClear();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.useRealTimers();
});

describe("HomeSearch", () => {
  it("renders a plain GET search form with a hidden label", async () => {
    const w = await mountSearch();
    const form = w.get("form");
    expect(form.attributes()).toMatchObject({ action: "/suche", method: "get", role: "search" });
    expect(input(w).attributes()).toMatchObject({
      name: "q",
      placeholder: "Wat suchste? Berlinerisch oder Hochdeutsch",
      role: "combobox",
      type: "search",
    });
    expect(w.get(`label[for="${input(w).attributes("id")}"]`).text()).toBe("Wort suchen");
    expect(w.get('button[type="submit"]').attributes("aria-label")).toBe("Suchen");
  });

  it("does not fetch the index on mount, only on first focus", async () => {
    const w = await mountSearch();
    await flushPromises();
    expect(fetchSearchIndex).not.toHaveBeenCalled();
    await input(w).trigger("focus");
    expect(fetchSearchIndex).toHaveBeenCalledTimes(1);
  });

  it("shows no list and fetches nothing below 2 characters", async () => {
    const w = await mountSearch();
    // Typing without the focus event: the input alone must not load the index.
    await input(w).setValue("k");
    await vi.advanceTimersByTimeAsync(150);
    await flushPromises();
    expect(fetchSearchIndex).not.toHaveBeenCalled();
    expect(w.find('[role="listbox"]').exists()).toBe(false);
    expect(input(w).attributes("aria-expanded")).toBe("false");
  });

  it("debounces the search by 150 ms", async () => {
    const w = await mountSearch();
    await input(w).setValue("krö");
    (input(w).element as HTMLInputElement).focus();
    await vi.advanceTimersByTimeAsync(149);
    await flushPromises();
    expect(options(w)).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();
    await vi.advanceTimersByTimeAsync(0);
    await flushPromises();
    expect(options(w).length).toBeGreaterThan(0);
  });

  it("groups lemma and meaning hits with marks", async () => {
    const w = await mountSearch();
    await type(w, "brö");
    const groups = w.findAll('[role="group"]');
    expect(groups.map((g) => g.text())).toEqual([
      expect.stringContaining("Berlinerisch"),
      expect.stringContaining("Gefunden über Hochdeutsch"),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]!.text()).toContain("Krömelkiste");
    expect(groups[1]!.text()).toContain("Krömelchen");
    expect(groups[1]!.find("mark").text()).toBe("Brö");
    expect(w.text()).toContain("Treffer für „brö“");
    expect(input(w).attributes("aria-expanded")).toBe("true");
  });

  it("shows at most 6 entries and links all hits", async () => {
    const w = await mountSearch();
    await type(w, "zappel");
    expect(options(w)).toHaveLength(6);
    const all = w.get('a[href="/suche?q=zappel"]');
    expect(all.text()).toContain("Alle 8 Treffer für „zappel“");
  });

  it("moves the active option with the arrow keys, wrapping", async () => {
    const w = await mountSearch();
    await type(w, "zappel");
    const ids = options(w).map((o) => o.attributes("id"));
    await input(w).trigger("keydown", { key: "ArrowDown" });
    expect(input(w).attributes("aria-activedescendant")).toBe(ids[0]);
    expect(options(w)[0]!.attributes("aria-selected")).toBe("true");
    await input(w).trigger("keydown", { key: "ArrowUp" });
    expect(input(w).attributes("aria-activedescendant")).toBe(ids[5]);
    await input(w).trigger("keydown", { key: "ArrowDown" });
    expect(input(w).attributes("aria-activedescendant")).toBe(ids[0]);
  });

  it("opens the active word on Enter", async () => {
    const w = await mountSearch();
    await type(w, "zappel");
    await input(w).trigger("keydown", { key: "ArrowDown" });
    await input(w).trigger("keydown", { key: "Enter" });
    expect(navigate).toHaveBeenCalledWith(expect.stringMatching(/^\/wort\/zappel\d$/));
  });

  it("submits to the search page on Enter without a selection, encoded", async () => {
    const w = await mountSearch();
    await input(w).setValue("  Straße über ");
    await input(w).trigger("keydown", { key: "Enter" });
    expect(navigate).toHaveBeenCalledWith("/suche?q=Stra%C3%9Fe%20%C3%BCber");
  });

  it("does not navigate for an empty or blank query", async () => {
    const w = await mountSearch();
    await input(w).setValue("   ");
    await input(w).trigger("keydown", { key: "Enter" });
    await w.get("form").trigger("submit");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("closes the list on Escape and clears on a second Escape", async () => {
    const w = await mountSearch();
    await type(w, "zappel");
    await input(w).trigger("keydown", { key: "Escape" });
    expect(input(w).attributes("aria-expanded")).toBe("false");
    expect(w.find('[role="listbox"]').exists()).toBe(false);
    await input(w).trigger("keydown", { key: "Escape" });
    expect((input(w).element as HTMLInputElement).value).toBe("");
  });

  it("shows the clear button only with text; it clears and keeps focus", async () => {
    const w = await mountSearch();
    expect(w.find('[aria-label="Eingabe löschen"]').exists()).toBe(false);
    await type(w, "zappel");
    const clear = w.get('[aria-label="Eingabe löschen"]');
    await clear.trigger("click");
    expect((input(w).element as HTMLInputElement).value).toBe("");
    expect(document.activeElement).toBe(input(w).element);
    expect(w.find('[role="listbox"]').exists()).toBe(false);
    expect(w.find('[aria-label="Eingabe löschen"]').exists()).toBe(false);
  });

  it("focuses the field on / but not while typing in another field", async () => {
    const w = await mountSearch();
    const other = document.createElement("input");
    document.body.append(other);
    other.focus();
    other.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "/" }));
    expect(document.activeElement).toBe(other);

    other.blur();
    // Stands in for the header's window listener that opens the search modal.
    const header = vi.fn();
    window.addEventListener("keydown", header);
    const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "/" });
    document.body.dispatchEvent(event);
    window.removeEventListener("keydown", header);
    expect(document.activeElement).toBe(input(w).element);
    expect(event.defaultPrevented).toBe(true);
    expect(header).not.toHaveBeenCalled();
    other.remove();
  });

  it("shows the no-hit state with similar words and a suggestion link", async () => {
    const w = await mountSearch();
    await type(w, "schnappix");
    expect(w.find('[role="listbox"]').exists()).toBe(false);
    const status = w.get('[role="status"]');
    expect(status.text()).toContain("Nüscht jefunden für „schnappix“");
    expect(status.text()).toContain("Meintest du");
    expect(status.get('a[href="/wort/schnuppel"]').text()).toBe("Schnuppel");
    const add = status.get('a[href="/wort-vorschlagen?wort=schnappix"]');
    expect(add.text()).toContain("„schnappix“ als Wort vorschlagen");
    expect(add.text()).toContain("Kennste dit? Dann trag et ein.");
  });

  it("omits the did-you-mean line without close lemmas", async () => {
    const w = await mountSearch();
    await type(w, "qqqqqqqq");
    const status = w.get('[role="status"]');
    expect(status.text()).toContain("Nüscht jefunden");
    expect(status.text()).not.toContain("Meintest du");
  });
});
