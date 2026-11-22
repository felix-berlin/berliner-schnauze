import WordStories from "@components/word/WordStories.vue";
import { openForm } from "@stores/contribute.ts";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const online = vi.hoisted(() => ({ value: true }));
vi.mock("@composables/useOnline.ts", async () => {
  const { ref: vueRef } = await import("vue");
  const state = vueRef(true);
  online.value = true;
  return {
    OFFLINE_HINT: "Du bist offline. Abstimmen und Mitmachen jeht wieder, sobald du Netz hast.",
    __state: state,
    useOnline: () => state,
  };
});
const { __state } = (await import("@composables/useOnline.ts")) as unknown as {
  __state: ReturnType<typeof ref<boolean>>;
};

const story = (id: number, extra: Record<string, unknown> = {}) => ({
  anders: 1,
  createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  id: String(id),
  jenau: 4,
  text: `Jeschichte ${id}`,
  ...extra,
});
const items = (n: number, from = 1) => Array.from({ length: n }, (_, i) => story(from + i));

type Route = (url: string, init?: RequestInit) => unknown;
let route: Route;
const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
  const result = route(url, init) as { body?: unknown; ok?: boolean } | undefined;
  if (result?.ok === false) return { json: async () => result.body ?? {}, ok: false, status: 502 };
  return { json: async () => result?.body ?? {}, ok: true, status: 200 };
});

const mountIt = async (
  initial: Partial<{ featured: unknown; items: unknown[]; total: number }> = {},
) => {
  const list = initial.items ?? items(3);
  const w = mount(WordStories, {
    attachTo: document.body,
    global: { stubs: { BerlinerBaer: true, ContributeForm: true } },
    props: {
      initial: { featured: null, items: list, total: list.length, ...initial } as never,
      label: "Schrippe",
      prompt: "Wo haste „Schrippe“ zuletzt jehört?",
      word: "schrippe",
    },
  });
  await flushPromises();
  return w;
};
const react = (
  w: Awaited<ReturnType<typeof mountIt>>,
  index: number,
  which: "Jenau!" | "Kenn ick anders",
) => [...w.findAll("li.item")][index]!.findAll("button").find((b) => b.text().startsWith(which))!;

beforeEach(() => {
  route = (url) =>
    url.startsWith("/api/stories/mine") ? { body: { pending: [], reactions: {} } } : {};
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("matchMedia", () => ({
    addEventListener() {},
    matches: false,
    removeEventListener() {},
  }));
  __state.value = true;
  openForm.set(null);
});
afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("WordStories list", () => {
  it("shows no „Alle … lesen“ for one story", async () => {
    const w = await mountIt({ items: items(1) });
    expect(w.text()).not.toContain("lesen");
  });

  it("shows three stories and expands in place, loading page 2 without repeating the featured story", async () => {
    route = (url) => {
      if (url.startsWith("/api/stories/mine")) return { body: { pending: [], reactions: {} } };
      return { body: { hasMore: false, items: [story(50), story(51), story(99)], page: 2 } };
    };
    const w = await mountIt({ featured: story(99), items: items(20), total: 24 });
    expect(w.findAll("li.item")).toHaveLength(3);
    const all = w.find("button.all");
    expect(all.text()).toBe("Alle 24 Jeschichten lesen");
    await all.trigger("click");
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledWith("/api/stories?word=schrippe&page=2", expect.anything());
    expect(w.findAll("li.item")).toHaveLength(22);
    expect(w.text()).not.toContain("Jeschichte 99");
    expect(w.find("button.all").exists()).toBe(false);
  });

  it("shows two stories on mobile", async () => {
    vi.stubGlobal("matchMedia", () => ({
      addEventListener() {},
      matches: true,
      removeEventListener() {},
    }));
    const w = await mountIt();
    expect(w.findAll("li.item")).toHaveLength(2);
    expect(w.find("button.all").exists()).toBe(true);
  });

  it("shows the gap state with the prompt and opens the form from the ask button", async () => {
    const w = await mountIt({ items: [], total: 0 });
    expect(w.text()).toContain("Noch keene Jeschichte zu „Schrippe“. Erzähl du die erste!");
    expect(w.text()).toContain("Frage der Woche");
    await w.find("button.ask").trigger("click");
    expect(openForm.get()).toBe("story");
  });

  it("escapes visitor text", async () => {
    const w = await mountIt({
      items: [story(1, { name: "<b>x</b>", text: "<img src=x onerror=alert(1)>" })],
    });
    expect(w.find("li.item img").exists()).toBe(false);
    expect(w.text()).toContain("<img src=x onerror=alert(1)>");
  });
});

describe("WordStories reactions", () => {
  it("moves the count from Jenau! to Kenn ick anders and withdraws on a second click", async () => {
    let body: unknown;
    route = (url, init) => {
      if (url.startsWith("/api/stories/mine")) return { body: { pending: [], reactions: {} } };
      body = JSON.parse(init?.body as string);
      const value = (body as { value: number }).value;
      return {
        body: {
          downvotes: 1 + (value === -1 ? 1 : 0),
          myVote: value,
          upvotes: 4 + (value === 1 ? 1 : 0),
        },
      };
    };
    const w = await mountIt();
    await react(w, 0, "Jenau!").trigger("click");
    expect(react(w, 0, "Jenau!").attributes("aria-pressed")).toBe("true");
    expect(react(w, 0, "Jenau!").text()).toContain("5");
    await flushPromises();
    await react(w, 0, "Kenn ick anders").trigger("click");
    expect(react(w, 0, "Jenau!").text()).toContain("4");
    expect(react(w, 0, "Kenn ick anders").text()).toContain("2");
    expect(react(w, 0, "Jenau!").attributes("aria-pressed")).toBe("false");
    await flushPromises();
    await react(w, 0, "Kenn ick anders").trigger("click");
    expect(body).toEqual({ commentId: 1, value: 0 });
    await flushPromises();
    expect(react(w, 0, "Kenn ick anders").attributes("aria-pressed")).toBe("false");
    expect(react(w, 0, "Kenn ick anders").text()).toContain("1");
  });

  it("rolls the count back when the call fails", async () => {
    route = (url) =>
      url.startsWith("/api/stories/mine")
        ? { body: { pending: [], reactions: {} } }
        : { ok: false };
    const w = await mountIt();
    await react(w, 0, "Jenau!").trigger("click");
    await flushPromises();
    expect(react(w, 0, "Jenau!").text()).toContain("4");
    expect(react(w, 0, "Jenau!").attributes("aria-pressed")).toBe("false");
    expect(w.text()).toContain("Ditt hat nich jeklappt.");
  });

  it("labels the buttons with the count and loads the own reactions as pressed", async () => {
    route = (url) =>
      url.startsWith("/api/stories/mine") ? { body: { pending: [], reactions: { "2": -1 } } } : {};
    const w = await mountIt();
    expect(react(w, 0, "Jenau!").attributes("aria-label")).toBe("Jenau!, 4");
    expect(react(w, 1, "Kenn ick anders").attributes("aria-pressed")).toBe("true");
    expect(react(w, 1, "Jenau!").attributes("aria-pressed")).toBe("false");
  });

  it("locks the reactions offline and shows the message", async () => {
    const w = await mountIt();
    __state.value = false;
    await flushPromises();
    const button = react(w, 0, "Jenau!");
    expect(button.attributes("aria-disabled")).toBe("true");
    expect(w.text()).toContain(
      "Du bist offline. Abstimmen und Mitmachen jeht wieder, sobald du Netz hast.",
    );
    await button.trigger("click");
    expect(fetchMock.mock.calls.some(([u]) => u === "/api/comment-votes")).toBe(false);
  });
});

describe("WordStories own pending", () => {
  it("shows the chip „Wird jeprüft“ for the own pending stories only", async () => {
    const without = await mountIt();
    expect(without.text()).not.toContain("Wird jeprüft");
    route = (url) =>
      url.startsWith("/api/stories/mine")
        ? {
            body: {
              pending: [
                { createdAt: "2026-11-01T10:00:00Z", id: 9, text: "Meine <i>neue</i> Jeschichte" },
              ],
              reactions: {},
            },
          }
        : {};
    const w = await mountIt();
    expect(w.text()).toContain("Wird jeprüft");
    expect(w.text()).toContain("Meine <i>neue</i> Jeschichte");
  });
});
