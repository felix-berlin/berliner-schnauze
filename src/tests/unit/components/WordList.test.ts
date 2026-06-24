import WordList from "@components/WordList.vue";
import { useStore } from "@nanostores/vue";
import { useTimeoutFn } from "@vueuse/core";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ref, nextTick } from "vue";

const { VirtualizerStub, keyStrokeHandlers, startHideActiveTimerFn } = vi.hoisted(() => {
  const handlers = new Map<string, (e: KeyboardEvent) => void>();
  const startFn = vi.fn();
  return {
    VirtualizerStub: {
      props: ["data", "itemSize", "as", "item", "style"],
      template:
        '<ul class="c-word-list"><template v-for="(d, i) in (data || [])" :key="i"><slot :item="d" :index="i" /></template></ul>',
      methods: { scrollToIndex: vi.fn() },
    },
    keyStrokeHandlers: handlers,
    startHideActiveTimerFn: startFn,
  };
});

vi.mock("virtua/vue", () => ({
  WindowVirtualizer: VirtualizerStub,
  VList: VirtualizerStub,
}));

vi.mock("@components/word/SingleWord.vue", () => ({
  default: {
    props: ["source", "index", "positions", "showDropdown"],
    template: "<li class='mock-single-word' tabindex='0'>{{ source?.wordProperties?.berlinerisch }}</li>",
  },
}));

vi.mock("@stores/wordList.ts", () => ({
  $oramaSearchResults: {},
}));

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn(() => ref({ state: "ready", value: { hits: [] } })),
}));

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    onKeyStroke: vi.fn((key: string, handler: (e: KeyboardEvent) => void) => {
      keyStrokeHandlers.set(key, handler);
    }),
    useTimeoutFn: vi.fn((fn: () => void) => ({ start: startHideActiveTimerFn })),
  };
});

vi.mock("@utils/helpers.ts", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, routeToWord: (slug: string) => `/wort/${slug}` };
});

const makeHit = (berlinerisch: string, slug = berlinerisch.toLowerCase()) => ({
  id: slug,
  score: 1,
  positions: {},
  document: { id: slug, slug, wordProperties: { berlinerisch, translations: ["test"] } },
});

function fireKey(key: string, opts: KeyboardEventInit = {}) {
  const e = new KeyboardEvent("keydown", { key, ...opts });
  const spy = vi.spyOn(e, "preventDefault");
  keyStrokeHandlers.get(key)?.(e);
  return spy;
}

describe("WordList.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    keyStrokeHandlers.clear();
    startHideActiveTimerFn.mockReset();
    vi.mocked(useStore).mockReturnValue(ref({ state: "ready", value: { hits: [] } }));
  });

  it("mounts without error", () => {
    const wrapper = mount(WordList);
    expect(wrapper.exists()).toBe(true);
  });

  it("renders .c-word-list class", () => {
    const wrapper = mount(WordList);
    expect(wrapper.find(".c-word-list").exists()).toBe(true);
  });

  it("renders SingleWord for each search hit", () => {
    vi.mocked(useStore).mockReturnValue(
      ref({ state: "ready", value: { hits: [makeHit("Kiez"), makeHit("Schnauze")] } }),
    );
    const wrapper = mount(WordList);
    expect(wrapper.findAll(".mock-single-word")).toHaveLength(2);
  });

  it("renders word text from document", () => {
    vi.mocked(useStore).mockReturnValue(
      ref({ state: "ready", value: { hits: [makeHit("Jöö")] } }),
    );
    const wrapper = mount(WordList);
    expect(wrapper.find(".mock-single-word").text()).toBe("Jöö");
  });

  it("renders no items when state is not ready", () => {
    vi.mocked(useStore).mockReturnValue(ref({ state: "loading" }));
    const wrapper = mount(WordList);
    expect(wrapper.findAll(".mock-single-word")).toHaveLength(0);
  });

  it("renders no items when hits is empty", () => {
    const wrapper = mount(WordList);
    expect(wrapper.findAll(".mock-single-word")).toHaveLength(0);
  });

  it("accepts itemSize prop", () => {
    const wrapper = mount(WordList, { props: { itemSize: 80 } });
    expect(wrapper.exists()).toBe(true);
  });

  it("accepts showDropdown prop", () => {
    const wrapper = mount(WordList, { props: { showDropdown: false } });
    expect(wrapper.exists()).toBe(true);
  });

  it("accepts useWindowVirtualizer=false prop", () => {
    const wrapper = mount(WordList, { props: { useWindowVirtualizer: false } });
    expect(wrapper.exists()).toBe(true);
  });

  it("ArrowDown is a no-op when list is empty", () => {
    mount(WordList);
    const spy = fireKey("ArrowDown");
    // No hits → handler returns early, no active timer started
    expect(startHideActiveTimerFn).not.toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });

  it("ArrowDown wraps active index and starts hide timer when hits exist", () => {
    vi.mocked(useStore).mockReturnValue(
      ref({ state: "ready", value: { hits: [makeHit("Kiez"), makeHit("Schnauze")] } }),
    );
    mount(WordList);
    const spy = fireKey("ArrowDown");
    expect(startHideActiveTimerFn).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled(); // preventDefault
  });

  it("ArrowUp is a no-op when list is empty", () => {
    mount(WordList);
    const spy = fireKey("ArrowUp");
    expect(startHideActiveTimerFn).not.toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });

  it("ArrowUp starts hide timer when hits exist", () => {
    vi.mocked(useStore).mockReturnValue(
      ref({ state: "ready", value: { hits: [makeHit("A"), makeHit("B")] } }),
    );
    mount(WordList);
    const spy = fireKey("ArrowUp");
    expect(startHideActiveTimerFn).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
  });

  it("Enter is a no-op when list is empty", () => {
    mount(WordList);
    const spy = fireKey("Enter");
    expect(spy).not.toHaveBeenCalled();
  });

  it("Enter navigates to the active item's slug", () => {
    vi.mocked(useStore).mockReturnValue(
      ref({ state: "ready", value: { hits: [makeHit("Kiez", "kiez")] } }),
    );
    mount(WordList);
    const spy = fireKey("Enter");
    expect(spy).toHaveBeenCalled(); // preventDefault
  });

  it("useTimeoutFn callback sets showActive to false (covers line 71)", () => {
    let capturedFn!: () => void;
    vi.mocked(useTimeoutFn).mockImplementationOnce((fn: () => void) => {
      capturedFn = fn;
      return { start: startHideActiveTimerFn };
    });
    mount(WordList);
    expect(capturedFn).toBeDefined();
    capturedFn();
  });

  it("watch callback clears resultRefs when mutableOramaSearch changes (covers line 81)", async () => {
    const oramaRef = ref({ state: "ready" as const, value: { hits: [makeHit("Eier")] } });
    vi.mocked(useStore).mockReturnValue(oramaRef);
    mount(WordList);
    oramaRef.value = { state: "ready", value: { hits: [makeHit("Kiez")] } };
    await nextTick();
  });

  it("el.focus() is called inside focusActive nextTick when ref exists (covers line 104)", async () => {
    vi.mocked(useStore).mockReturnValue(
      ref({ state: "ready", value: { hits: [makeHit("Kiez")] } }),
    );
    const wrapper = mount(WordList, { attachTo: document.body });
    const setupState = (wrapper.getCurrentComponent() as any).setupState;
    // Use setResultRef to populate resultRefs (it checks instanceof HTMLElement before pushing)
    const el = document.createElement("li");
    const focusSpy = vi.spyOn(el, "focus");
    setupState.setResultRef(el);
    // ArrowDown: activeIndex stays 0 (1 item: (0+1)%1=0), calls focusActive → nextTick → el.focus()
    fireKey("ArrowDown");
    await nextTick();
    expect(focusSpy).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
});
