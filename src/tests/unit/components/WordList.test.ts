import WordList from "@components/WordList.vue";
import { useStore } from "@nanostores/vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ref } from "vue";

const { VirtualizerStub } = vi.hoisted(() => ({
  VirtualizerStub: {
    props: ["data", "itemSize", "as", "item", "style"],
    template:
      '<ul class="c-word-list"><template v-for="(d, i) in (data || [])" :key="i"><slot :item="d" :index="i" /></template></ul>',
    methods: { scrollToIndex: vi.fn() },
  },
}));

vi.mock("virtua/vue", () => ({
  WindowVirtualizer: VirtualizerStub,
  VList: VirtualizerStub,
}));

vi.mock("@components/word/SingleWord.vue", () => ({
  default: {
    props: ["source", "index", "positions", "showDropdown"],
    template: "<li class='mock-single-word'>{{ source?.wordProperties?.berlinerisch }}</li>",
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
    onKeyStroke: vi.fn(),
    useTimeoutFn: vi.fn(() => ({ start: vi.fn() })),
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

describe("WordList.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    vi.mocked(useStore).mockReturnValue(ref({ state: "ready", value: { hits: [] } }));
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
});
