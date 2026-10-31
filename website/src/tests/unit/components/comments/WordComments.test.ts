import WordComments from "@components/comments/WordComments.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("astro:env/client", () => ({ TURNSTILE_SITE_KEY: "k" }));
vi.mock("@stores/toastNotify.ts", () => ({ createToastNotify: vi.fn() }));
vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

// virtua needs real layout, which jsdom lacks
vi.mock("virtua/vue", () => ({
  WindowVirtualizer: {
    methods: { scrollToIndex: () => {} },
    props: ["data"],
    template: '<ul><li v-for="item in data" :key="item.id"><slot :item="item" /></li></ul>',
  },
}));

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.stubGlobal("fetch", fetchMock);

describe("WordComments", () => {
  it("shows the empty state and the total", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ comments: [], hasMore: false, total: 0 }),
      ok: true,
      status: 200,
    });
    const wrapper = mount(WordComments, {
      global: { stubs: { TurnStile: true } },
      props: { wordId: 7 },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("Noch keen Senf dazu. Mach den Anfang!");
    expect(wrapper.text()).toContain("(0)");
    expect(wrapper.find("[aria-pressed=true]").text()).toBe("Beste");
  });

  it("no empty state while another page is still to come", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ comments: [], hasMore: true, total: 3 }),
      ok: true,
      status: 200,
    });
    const wrapper = mount(WordComments, { global: { stubs: { TurnStile: true } }, props: { wordId: 7 } });
    await flushPromises();
    expect(wrapper.text()).not.toContain("Noch keen Senf");
  });

  it("loads the linked thread and highlights its card for a #kommentar hash", async () => {
    const card = { authorName: "Icke", createdAt: new Date().toISOString(), downvotes: 0, edited: false, id: 42, myVote: 0, parentId: null, removalReason: null, replies: [], state: "visible", text: "Verlinkt", upvotes: 0 };
    fetchMock.mockImplementation(async (url: string) => ({
      json: async () =>
        url.endsWith("/42") ? { comment: card } : { comments: [], hasMore: false, total: 1 },
      ok: true,
      status: 200,
    }));
    location.hash = "#kommentar-42";
    const wrapper = mount(WordComments, {
      global: {
        stubs: { TurnStile: true },
      },
      props: { wordId: 7 },
    });
    await vi.waitFor(() => expect(wrapper.find("#kommentar-42.is-highlighted").exists()).toBe(true));
    expect(wrapper.text()).toContain("Verlinkt");
    wrapper.unmount();
    location.hash = "";
  });

  // The ClientRouter moves same-page hash links with pushState: no hashchange fires.
  it("highlights a card when its timestamp link is clicked", async () => {
    const card = { authorName: "Icke", createdAt: new Date().toISOString(), downvotes: 0, edited: false, id: 5, myVote: 0, parentId: null, removalReason: null, replies: [], state: "visible", text: "Hier", upvotes: 0 };
    fetchMock.mockResolvedValue({
      json: async () => ({ comments: [card], hasMore: false, total: 1 }),
      ok: true,
      status: 200,
    });
    Element.prototype.scrollIntoView = vi.fn();
    const router = (e: Event) => {
      const a = (e.target as Element).closest("a");
      if (!a) return;
      e.preventDefault();
      history.pushState({}, "", a.getAttribute("href")!);
    };
    document.addEventListener("click", router);
    const wrapper = mount(WordComments, { attachTo: document.body, global: { stubs: { TurnStile: true } }, props: { wordId: 7 } });
    await vi.waitFor(() => expect(wrapper.find("#kommentar-5").exists()).toBe(true));
    expect(wrapper.find("#kommentar-5").classes()).not.toContain("is-highlighted");
    await wrapper.find('a[href="#kommentar-5"]').trigger("click");
    await vi.waitFor(() => expect(wrapper.find("#kommentar-5").classes()).toContain("is-highlighted"));
    document.removeEventListener("click", router);
    wrapper.unmount();
    location.hash = "";
  });
});
