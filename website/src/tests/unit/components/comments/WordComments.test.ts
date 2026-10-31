import CommentForm from "@components/comments/CommentForm.vue";
import WordComments from "@components/comments/WordComments.vue";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

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
  enableAutoUnmount(afterEach);
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
    expect(wrapper.text()).toContain("Hier hat noch keener wat jesacht. Fang du doch an!");
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
    expect(wrapper.text()).not.toContain("noch keener wat jesacht");
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

  const page = (body: object) => ({ json: async () => body, ok: true, status: 200 });
  const empty = { comments: [], hasMore: false, total: 0 };
  const resetSpy = vi.fn();
  const TurnStileStub = { emits: ["token"], methods: { reset: resetSpy }, template: "<div />" };

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("„Neueste“ reloads sorted by date", async () => {
    fetchMock.mockResolvedValue(page(empty));
    const wrapper = mount(WordComments, { global: { stubs: { TurnStile: true } }, props: { wordId: 7 } });
    await flushPromises();
    await wrapper.findAll(".c-word-comments__sort-button")[1]!.trigger("click");
    await flushPromises();
    expect(wrapper.find("[aria-pressed=true]").text()).toBe("Neueste");
    expect(fetchMock.mock.calls.at(-1)![0]).toContain("sort=new");
  });

  it("a new comment waits for the token, then posts, resets the captcha and is tracked", async () => {
    const { createToastNotify } = await import("@stores/toastNotify.ts");
    const { trackEvent } = await import("@utils/analytics");
    vi.mocked(trackEvent).mockClear();
    fetchMock.mockResolvedValue(page(empty));
    const wrapper = mount(WordComments, { global: { stubs: { TurnStile: TurnStileStub } }, props: { wordId: 7 } });
    await flushPromises();
    const submit = wrapper.findComponent(CommentForm).props("submit") as (v: { authorName: string; text: string }) => Promise<boolean>;
    expect(await submit({ authorName: "", text: "Na sowat" })).toBe(false);
    expect(createToastNotify).toHaveBeenCalledWith(expect.objectContaining({ status: "warning" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    wrapper.findComponent(TurnStileStub).vm.$emit("token", "tok");
    fetchMock.mockResolvedValueOnce({ json: async () => ({ error: "x" }), ok: false, status: 400 });
    expect(await submit({ authorName: "", text: "Na sowat" })).toBe(false);
    expect(trackEvent).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce({ json: async () => ({ editKey: "k".repeat(43), pending: true }), ok: true, status: 201 });
    expect(await submit({ authorName: "", text: "Na sowat" })).toBe(true);
    expect(resetSpy).toHaveBeenCalledTimes(2);
    expect(trackEvent).toHaveBeenCalledWith("Comments", "Post", "7");
  });

  it("loads the next page when the end of the list scrolls into view", async () => {
    let fire!: (entries: { isIntersecting: boolean }[]) => void;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: typeof fire) {
          fire = cb;
        }
        disconnect() {}
        observe() {}
        unobserve() {}
      },
    );
    fetchMock.mockResolvedValue(page({ comments: [], hasMore: true, total: 3 }));
    mount(WordComments, { global: { stubs: { TurnStile: true } }, props: { wordId: 7 } });
    await flushPromises();
    fire([{ isIntersecting: false }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fire([{ isIntersecting: true }]);
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]![0]).toContain("page=2");
  });

  it("ignores other hashes and clicks that are not comment links", async () => {
    fetchMock.mockResolvedValue(page(empty));
    location.hash = "#bedeutung";
    const wrapper = mount(WordComments, { global: { stubs: { TurnStile: true } }, props: { wordId: 7 } });
    await flushPromises();
    await wrapper.find("h2").trigger("click");
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the first page, no thread request
    location.hash = "";
  });

  it("a link to a deleted comment neither scrolls nor highlights", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith("/77") ? { json: async () => ({}), ok: false, status: 404 } : page(empty),
    );
    location.hash = "#kommentar-77";
    const wrapper = mount(WordComments, { global: { stubs: { TurnStile: true } }, props: { wordId: 7 } });
    await flushPromises();
    expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith("/77"))).toBe(true);
    expect(wrapper.find(".is-highlighted").exists()).toBe(false);
    location.hash = "";
  });

  it("finds a linked reply inside its thread", async () => {
    const card = (id: number, replies: object[] = []) => ({ authorName: "Icke", createdAt: new Date().toISOString(), downvotes: 0, edited: false, id, myVote: 0, parentId: null, removalReason: null, replies, state: "visible", text: `Text ${id}`, upvotes: 0 });
    fetchMock.mockResolvedValue(page({ comments: [card(1), card(5, [{ ...card(6), parentId: 5 }])], hasMore: false, total: 3 }));
    Element.prototype.scrollIntoView = vi.fn();
    const wrapper = mount(WordComments, { global: { stubs: { TurnStile: true } }, props: { wordId: 7 } });
    await flushPromises();
    location.hash = "#kommentar-6";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    await vi.waitFor(() => expect(wrapper.find("#kommentar-6.is-highlighted").exists()).toBe(true));
    wrapper.unmount();
    location.hash = "";
  });
});

