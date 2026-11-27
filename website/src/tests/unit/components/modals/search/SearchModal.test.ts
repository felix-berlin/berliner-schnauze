import SearchModal from "@components/modals/search/SearchModal.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { hit, result } from "../../search/fixtures";

const mocks = vi.hoisted(() => ({
  close: vi.fn(),
  fetchSearchIndex: vi.fn(),
  getWordDb: vi.fn(),
  navigate: vi.fn(),
  runSearch: vi.fn(),
  scrollToIndex: vi.fn(),
}));
const hasKeyboard = ref(true);

vi.mock("virtua/vue", () => ({
  Virtualizer: {
    methods: { scrollToIndex: mocks.scrollToIndex },
    props: ["data", "scrollRef"],
    template:
      '<div><template v-for="(d, i) in (data || [])" :key="i"><slot :item="d" :index="i" /></template></div>',
  },
}));
vi.mock("@services/wordSearchDb", () => ({ FULL_TEXT: {}, getWordDb: mocks.getWordDb }));
vi.mock("@services/searchIndex.ts", () => ({ fetchSearchIndex: mocks.fetchSearchIndex }));
vi.mock("@lib/search/run", () => ({ runSearch: mocks.runSearch }));
vi.mock("astro:transitions/client", () => ({ navigate: mocks.navigate }));
vi.mock("@utils/reportError.ts", () => ({ reportError: vi.fn() }));
vi.mock("@stores/modal.ts", () => ({ close: mocks.close }));
vi.mock("@components/ModalCloseButton.vue", () => ({
  default: { template: "<button class='mock-modal-close'><slot name='suffix' /></button>" },
}));
vi.mock("@vueuse/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@vueuse/core")>()),
  useMediaQuery: vi.fn(() => hasKeyboard),
}));

const mountModal = () => mount(SearchModal, { attachTo: document.body });
const field = (w: ReturnType<typeof mountModal>) => w.get('input[role="combobox"]');
const type = async (w: ReturnType<typeof mountModal>, q: string) => {
  await field(w).setValue(q);
  await vi.advanceTimersByTimeAsync(200);
  await flushPromises();
};

beforeEach(() => {
  vi.useFakeTimers();
  hasKeyboard.value = true;
  mocks.getWordDb.mockResolvedValue({ db: {}, size: 1 });
  mocks.fetchSearchIndex.mockResolvedValue([]);
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

describe("SearchModal", () => {
  it("lists ranked hits with divider", async () => {
    mocks.runSearch.mockResolvedValue(
      result([], {
        rows: [
          { hit: hit("Quarkwolke"), kind: "hit" },
          { kind: "divider", label: "Ab hier: Treffer in der Bedeutung" },
          { hit: hit("Zwiebelturm", 3), kind: "hit" },
        ],
        total: 2,
      }),
    );
    const w = mountModal();
    await type(w, "quark");

    expect(mocks.runSearch).toHaveBeenLastCalledWith(
      {},
      [],
      expect.objectContaining({ q: "quark" }),
      expect.anything(),
    );
    const options = w.findAll('[role="option"]');
    expect(options.map((o) => o.text())).toEqual([
      expect.stringContaining("Quarkwolke"),
      expect.stringContaining("Zwiebelturm"),
    ]);
    expect(w.text()).toContain("Ab hier: Treffer in der Bedeutung");
    expect(w.find('[role="option"] mark').text()).toBe("Quark");
    // Compact rows: no usage share, no play button.
    expect(w.text()).not.toContain("jesagt");
    expect(w.text()).not.toContain("zu wenig Stimmen");
  });

  it("opens the active hit with arrow keys and Enter", async () => {
    mocks.runSearch.mockResolvedValue(result(["Quarkwolke", "Quarkspitze"]));
    const w = mountModal();
    await type(w, "quark");

    await field(w).trigger("keydown", { key: "ArrowDown" });
    await field(w).trigger("keydown", { key: "ArrowDown" });
    await flushPromises();
    expect(field(w).attributes("aria-activedescendant")).toBe("schnellsuche-quarkspitze");
    await field(w).trigger("keydown", { key: "Enter" });
    expect(mocks.navigate).toHaveBeenCalledWith("/wort/quarkspitze");
  });

  it("link carries the query", async () => {
    mocks.runSearch.mockResolvedValue(result(["Quarkwolke"]));
    const w = mountModal();
    await type(w, "quark, brot");

    const link = w.get("a[data-all]");
    expect(link.text()).toBe("Alle Treffer und Filter");
    expect(link.attributes("href")).toBe("/wort?q=quark,+brot");
  });

  it("no filter controls rendered", async () => {
    mocks.runSearch.mockResolvedValue(result(["Quarkwolke"]));
    const w = mountModal();
    await type(w, "quark");

    expect(w.findAll("select, input:not([type='search']), [role='group']")).toHaveLength(0);
    expect(w.text().replace("Alle Treffer und Filter", "")).not.toMatch(
      /Filter|Sortieren|Nach Bedeutung/,
    );
    expect(w.findAll("button").map((b) => b.attributes("aria-label") ?? b.text())).toEqual([
      "Suche leeren",
      "schließen",
    ]);
  });

  it("does not show „Keene Treffer“ while the index loads", async () => {
    mocks.getWordDb.mockReturnValue(new Promise(() => {}));
    const w = mountModal();
    await type(w, "quark");

    expect(w.text()).toContain("Suche läuft");
    expect(w.text()).not.toContain("Keene Treffer");
    expect(mocks.runSearch).not.toHaveBeenCalled();
  });

  it("drops a stale answer", async () => {
    let first!: (r: unknown) => void;
    mocks.runSearch
      .mockReturnValueOnce(new Promise((res) => (first = res)))
      .mockResolvedValueOnce(result(["Zwiebelturm"]));
    const w = mountModal();
    await type(w, "quark");
    await type(w, "zwiebel");
    first(result(["Quarkwolke"]));
    await flushPromises();

    expect(w.text()).toContain("Zwiebelturm");
    expect(w.text()).not.toContain("Quarkwolke");
  });

  it("closes the modal when a navigation swaps the page", () => {
    mountModal();
    document.dispatchEvent(new Event("astro:before-swap"));
    expect(mocks.close).toHaveBeenCalled();
  });

  it("keeps the keyboard hints only with a keyboard", async () => {
    const w = mountModal();
    expect(w.find("footer").text()).toContain("zum navigieren");
    hasKeyboard.value = false;
    await flushPromises();
    expect(w.find("footer").text()).not.toContain("zum navigieren");
    expect(w.find(".mock-modal-close").exists()).toBe(true);
  });
});
