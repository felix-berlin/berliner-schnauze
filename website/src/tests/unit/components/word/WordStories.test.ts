import WordStories from "@components/word/WordStories.vue";
import { openForm } from "@stores/contribute.ts";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const online = vi.hoisted(() => ({ value: true }));
vi.mock("@vueuse/core", async (importOriginal) => {
  const { ref: vueRef } = await import("vue");
  const state = vueRef(true);
  online.value = true;
  return {
    ...(await importOriginal<typeof import("@vueuse/core")>()),
    __state: state,
    useOnline: () => state,
  };
});
const { __state } = (await import("@vueuse/core")) as unknown as {
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
// The page shell's "word" breakpoint: 808px = 50.5rem, a viewport query (`width < 50.5rem`).
const removed = vi.fn();
const viewport = (width: number) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    addEventListener() {},
    matches: query === "(width < 50.5rem)" && width < 808,
    removeEventListener: removed,
  }));

let route: Route;
const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
  const result = (await route(url, init)) as { body?: unknown; ok?: boolean } | undefined;
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
  viewport(1280);
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

  it("follows the 808px breakpoint: two stories below it, three from it", async () => {
    viewport(700); // tablet portrait below the "word" breakpoint, still two
    expect((await mountIt({ items: items(5) })).findAll("li.item")).toHaveLength(2);
    viewport(808);
    expect((await mountIt({ items: items(5) })).findAll("li.item")).toHaveLength(3);
  });

  it("renders three stories in the first (hydration) render even on a narrow viewport, two after mount", async () => {
    viewport(390);
    const w = mount(WordStories, {
      attachTo: document.body,
      global: { stubs: { BerlinerBaer: true, ContributeForm: true } },
      props: {
        initial: { featured: null, items: items(3), total: 3 } as never,
        label: "Schrippe",
        prompt: "p",
        word: "schrippe",
      },
    });
    // No await: the DOM is still the first render, the one the server markup must equal.
    expect(w.findAll("li.item")).toHaveLength(3);
    await flushPromises();
    expect(w.findAll("li.item")).toHaveLength(2);
  });

  it("keeps the third story reachable on mobile: two shown, the button reveals all three", async () => {
    viewport(390);
    const w = await mountIt({ items: items(3) });
    expect(w.findAll("li.item")).toHaveLength(2);
    await w.find("button.all").trigger("click");
    await flushPromises();
    expect(w.findAll("li.item")).toHaveLength(3);
    expect(w.find("button.all").exists()).toBe(false);
  });

  it("marks the third collapsed story for the breakpoint rule and removes the media listener on unmount", async () => {
    const w = await mountIt({ items: items(3) });
    expect(w.findAll("li.item")[2]!.attributes("data-narrow-hidden")).toBeDefined();
    expect(w.findAll("li.item")[1]!.attributes("data-narrow-hidden")).toBeUndefined();
    w.unmount();
    // VueUse registers the listener (passive) and removes it with the same options.
    expect(removed).toHaveBeenCalledWith("change", expect.any(Function), { passive: true });
  });

  it("keeps the button for a retry when a further page fails, and loads it on the second try", async () => {
    let fail = true;
    route = (url) => {
      if (url.startsWith("/api/stories/mine")) return { body: { pending: [], reactions: {} } };
      return fail ? { ok: false } : { body: { hasMore: false, items: [story(50)], page: 2 } };
    };
    const w = await mountIt({ items: items(20), total: 21 });
    await w.find("button.all").trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Ditt hat nich jeklappt.");
    expect(w.findAll("li.item")).toHaveLength(20); // what was loaded is shown
    expect(w.find("button.all").text()).toBe("Alle 21 Jeschichten lesen");
    fail = false;
    await w.find("button.all").trigger("click");
    await flushPromises();
    expect(w.findAll("li.item")).toHaveLength(21);
    expect(w.find("button.all").exists()).toBe(false);
  });

  it("shows a loading state on the button while the further pages load", async () => {
    let release: (v: unknown) => void = () => {};
    route = (url) =>
      url.startsWith("/api/stories/mine")
        ? { body: { pending: [], reactions: {} } }
        : new Promise((resolve) => (release = resolve));
    const w = await mountIt({ items: items(20), total: 21 });
    await w.find("button.all").trigger("click");
    expect(w.find("button.all").text()).toBe("Lade …");
    expect(w.find("button.all").attributes("aria-busy")).toBe("true");
    expect(w.findAll("li.item")).toHaveLength(20); // already revealed
    release({ body: { hasMore: false, items: [story(50)], page: 2 } });
    await flushPromises();
    expect(w.findAll("li.item")).toHaveLength(21);
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

describe("WordStories reactions, edge cases", () => {
  it("sends one request for a double click (busy guard)", async () => {
    let release: (v: unknown) => void = () => {};
    route = (url) =>
      url.startsWith("/api/stories/mine")
        ? { body: { pending: [], reactions: {} } }
        : new Promise((resolve) => (release = resolve));
    const w = await mountIt();
    await react(w, 0, "Jenau!").trigger("click");
    await react(w, 0, "Jenau!").trigger("click");
    expect(fetchMock.mock.calls.filter(([u]) => u === "/api/comment-votes")).toHaveLength(1);
    release({ body: { downvotes: 1, myVote: 1, upvotes: 5 } });
    await flushPromises();
  });

  it("works without the own state when /mine fails", async () => {
    route = (url) => (url.startsWith("/api/stories/mine") ? { ok: false } : {});
    const w = await mountIt();
    expect(w.findAll("li.item")).toHaveLength(3);
    expect(react(w, 0, "Jenau!").attributes("aria-pressed")).toBe("false");
    expect(w.text()).not.toContain("Wird jeprüft");
    expect(w.text()).toContain("Deine eijenen Jeschichten konnten nich jeladen werden.");
  });

  it("does not let a late /mine answer overwrite a reaction made meanwhile", async () => {
    let release: (v: unknown) => void = () => {};
    route = (url, init) => {
      if (url.startsWith("/api/stories/mine")) return new Promise((resolve) => (release = resolve));
      const value = JSON.parse(init?.body as string).value;
      return { body: { downvotes: 1, myVote: value, upvotes: 4 + value } };
    };
    const w = await mountIt();
    await react(w, 0, "Jenau!").trigger("click");
    await flushPromises();
    release({ body: { pending: [], reactions: { "1": -1, "2": 1 } } }); // stale for story 1
    await flushPromises();
    expect(react(w, 0, "Jenau!").attributes("aria-pressed")).toBe("true");
    expect(react(w, 0, "Kenn ick anders").attributes("aria-pressed")).toBe("false");
    expect(react(w, 1, "Jenau!").attributes("aria-pressed")).toBe("true"); // untouched stories take it
  });

  it("never shows a count below 0", async () => {
    let release: (v: unknown) => void = () => {};
    route = (url) =>
      url.startsWith("/api/stories/mine")
        ? { body: { pending: [], reactions: { "1": 1 } } }
        : new Promise((resolve) => (release = resolve));
    const w = await mountIt({ items: [story(1, { jenau: 0 })] });
    await react(w, 0, "Jenau!").trigger("click"); // withdraws a reaction the cached count does not contain
    expect(react(w, 0, "Jenau!").text()).toContain("0");
    expect(react(w, 0, "Jenau!").attributes("aria-label")).toBe("Jenau!, 0");
    release({ ok: false });
    await flushPromises();
  });

  it("keeps the status region rendered when it is empty and fills it on a failed reaction", async () => {
    route = (url) =>
      url.startsWith("/api/stories/mine")
        ? { body: { pending: [], reactions: {} } }
        : { ok: false };
    const w = await mountIt();
    const region = w.find("[role=status]");
    expect(region.exists()).toBe(true);
    expect(region.text()).toBe("");
    await react(w, 0, "Jenau!").trigger("click");
    await flushPromises();
    expect(w.find("[role=status]").text()).toBe("Ditt hat nich jeklappt.");
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

describe("WordStories states", () => {
  it("binds aria-expanded of „Alle … lesen“ to the expanded state", async () => {
    route = (url) =>
      url.startsWith("/api/stories/mine")
        ? { body: { pending: [], reactions: {} } }
        : { body: { hasMore: true, items: [story(50)], page: 2 } };
    const w = await mountIt({ items: items(5), total: 9 });
    expect(w.find("button.all").attributes("aria-expanded")).toBe("false");
    await w.find("button.all").trigger("click");
    await flushPromises();
    expect(w.find("button.all").attributes("aria-expanded")).toBe("true");
  });

  it("leaves aria-expanded of the ask button to the trigger wiring (no Vue binding)", async () => {
    const w = await mountIt();
    const ask = w.find("button.ask");
    expect(ask.attributes("data-contribute")).toBe("story");
    ask.element.setAttribute("aria-expanded", "true"); // contributeTriggers.ts writes it
    await w.vm.$forceUpdate();
    expect(ask.attributes("aria-expanded")).toBe("true");
  });

  it("shows the relative age after mount", async () => {
    const w = await mountIt();
    expect(w.find(".by").text()).toMatch(/vor 3 Tagen$/);
  });

  it("shows the server text of a failed reaction, e.g. the rate limit", async () => {
    route = (url) =>
      url.startsWith("/api/stories/mine")
        ? { body: { pending: [], reactions: {} } }
        : { body: { error: "Ma langsam, Keule." }, ok: false };
    const w = await mountIt();
    await react(w, 0, "Jenau!").trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Ma langsam, Keule.");
    expect(react(w, 0, "Jenau!").text()).toContain("4");
  });
});

describe("WordStories coverage gaps", () => {
  const voteRoute =
    (vote: Route): Route =>
    (url, init) =>
      url.startsWith("/api/stories/mine")
        ? { body: { pending: [], reactions: {} } }
        : vote(url, init);

  it("rolls back with the generic message when the network call itself throws", async () => {
    const w = await mountIt();
    fetchMock.mockImplementationOnce(async () => {
      throw new TypeError("offline");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    await react(w, 0, "Jenau!").trigger("click");
    await flushPromises();
    expect(react(w, 0, "Jenau!").text()).toContain("4");
    expect(w.find("[role=status]").text()).toBe("Ditt hat nich jeklappt.");
  });

  it("shows a client error of a reaction with its own text and a bare failure with the generic one", async () => {
    vi.stubGlobal("fetch", async (url: string) =>
      url.startsWith("/api/stories/mine")
        ? { json: async () => ({}), ok: true, status: 200 }
        : { json: async () => Promise.reject(new Error("no json")), ok: false, status: 429 },
    );
    const w = await mountIt();
    await react(w, 0, "Jenau!").trigger("click");
    await flushPromises();
    expect(w.find("[role=status]").text()).toBe("Ditt hat nich jeklappt.");
  });

  it("copes with an own-state answer without reactions or pending, and cuts a long pending text", async () => {
    route = (url) => (url.startsWith("/api/stories/mine") ? { body: {} } : {});
    expect((await mountIt()).text()).not.toContain("Wird jeprüft");
    const long = "x".repeat(100);
    route = (url) =>
      url.startsWith("/api/stories/mine")
        ? {
            body: {
              pending: [
                { id: 9, text: long },
                { id: 10, text: "kurz" },
              ],
            },
          }
        : {};
    const w = await mountIt();
    expect(w.text()).toContain(`${"x".repeat(80)}…`);
    expect(w.text()).not.toContain("x".repeat(81));
    expect(w.text()).toContain("kurz");
  });

  it("names the author and the district, and falls back for an unknown district", async () => {
    const w = await mountIt({
      items: [story(1, { bezirk: "pankow", name: "Testkind" }), story(2, { bezirk: "nirgendwo" })],
    });
    expect(w.findAll(".by")[0]?.text()).toMatch(/^Testkind · aus Pankow · /);
    expect(w.findAll(".by")[1]?.text()).toMatch(/^aus der Community · vor/);
  });

  it("loads the next page only once for a double click on the read-all button", async () => {
    let release: (v: unknown) => void = () => {};
    route = voteRoute(() => new Promise((resolve) => (release = resolve)));
    const w = await mountIt({ items: items(20), total: 21 });
    await w.find("button.all").trigger("click");
    await w.find("button.all").trigger("click");
    expect(fetchMock.mock.calls.filter(([u]) => u.startsWith("/api/stories?"))).toHaveLength(1);
    release({ body: { hasMore: false, items: [story(50)], page: 2 } });
    await flushPromises();
  });

  it("moves focus to the first story that arrived when only the further pages bring new ones", async () => {
    route = voteRoute(() => ({ body: { hasMore: false, items: [story(50)], page: 2 } }));
    const w = await mountIt({ items: items(3), total: 4 });
    await w.find("button.all").trigger("click");
    await flushPromises();
    expect(w.findAll("li.item")).toHaveLength(4);
    expect(document.activeElement).toBe(w.findAll("li.item")[3]!.element);
  });

  it("hides the status line for the offline hint without stories", async () => {
    const w = await mountIt({ items: [], total: 0 });
    __state.value = false;
    await flushPromises();
    expect(w.text()).not.toContain("offline");
  });
});
