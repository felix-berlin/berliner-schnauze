import SemanticSearch from "@components/search/SemanticSearch.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { entry, state } from "./fixtures";

const mocks = vi.hoisted(() => ({ reportError: vi.fn(), trackEvent: vi.fn() }));
vi.mock("astro:transitions/client", () => ({ navigate: vi.fn() }));
vi.mock("@utils/reportError.ts", () => ({ reportError: mocks.reportError }));
vi.mock("@utils/analytics", () => ({ trackEvent: mocks.trackEvent }));

const deferred = <T>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, reject, resolve };
};

const words = ["Quarkwolke", "Plinsentopf", "Zuckerkante"].map((w) => entry(w));
const answer = (...slugs: string[]) => JSON.stringify({ slugs });

/** A fake Prompt API on globalThis; `prompt` answers with the given implementation. */
function model(prompt: (text: string, o: { signal: AbortSignal }) => Promise<string>) {
  const monitor = new EventTarget();
  const clone = { destroy: vi.fn(), prompt: vi.fn(prompt) };
  const base = { clone: vi.fn(async () => clone), destroy: vi.fn() };
  const create = vi.fn(async (o: { monitor?: (m: EventTarget) => void }) => {
    o.monitor?.(monitor);
    return base;
  });
  vi.stubGlobal("LanguageModel", { availability: vi.fn(async () => "available"), create });
  return { base, clone, create, monitor };
}

type Props = InstanceType<typeof SemanticSearch>["$props"];
const mountBlock = (props: Partial<Props> = {}) =>
  mount(SemanticSearch, {
    attachTo: document.body,
    props: {
      availability: "available",
      find: async () => words,
      state: state({ q: "wat Süßet zum Kaffee" }),
      trendRanks: new Map(),
      ...props,
    } as Props,
  });
type Wrapper = ReturnType<typeof mountBlock>;
const start = async (w: Wrapper) => {
  (w.vm as unknown as { start(): void }).start();
  await flushPromises();
};
const button = (w: Wrapper, name: string) =>
  w.findAll("button").find((b) => b.text().includes(name))!;

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

describe("SemanticSearch", () => {
  it("shows the top hits, Ja tracks only the answer", async () => {
    model(async () => answer("zuckerkante", "erfunden", "quarkwolke"));
    const w = mountBlock();
    await start(w);
    expect(w.text()).toContain("Passt vielleicht: 2 Wörter nach Bedeutung");
    expect(w.findAll('[role="option"]').map((o) => o.attributes("id"))).toEqual([
      "ki-zuckerkante",
      "ki-quarkwolke",
    ]);
    expect(w.text()).not.toContain("Warum");
    await button(w, "Ja").trigger("click");
    expect(mocks.trackEvent).toHaveBeenCalledWith("Search", "AI feedback", "ja");
    expect(button(w, "Ja").attributes("aria-pressed")).toBe("true");
  });

  it("downloadable shows the laden state", async () => {
    const { create } = model(async () => answer("quarkwolke"));
    const w = mountBlock({ availability: "downloadable" });
    await start(w);
    expect(w.text()).toContain("Einmal dit KI-Modell laden?");
    expect(create).not.toHaveBeenCalled();
    await button(w, "Modell laden und suchen").trigger("click");
    await flushPromises();
    expect(create).toHaveBeenCalledOnce();
    expect(w.text()).toContain("Passt vielleicht");
  });

  it("downloadprogress updates the progress value", async () => {
    const m = model(async () => answer("quarkwolke"));
    const created = deferred<typeof m.base>();
    m.create.mockImplementation(async (o) => {
      o.monitor?.(m.monitor);
      return created.promise;
    });
    const w = mountBlock({ availability: "downloadable" });
    await start(w);
    await button(w, "Modell laden und suchen").trigger("click");
    m.monitor.dispatchEvent(Object.assign(new Event("downloadprogress"), { loaded: 0.42 }));
    await flushPromises();
    expect((w.get("progress").element as HTMLProgressElement).value).toBe(0.42);
    expect(w.text()).toContain("Modell wird jeladen … 42 %");
  });

  it("abort on query change", async () => {
    let signal!: AbortSignal;
    const reply = deferred<string>();
    model((_, o) => ((signal = o.signal), reply.promise));
    const w = mountBlock();
    await start(w);
    expect(w.text()).toContain("KI sortiert die besten 40 Kandidaten …");
    await w.setProps({ state: state({ q: "wat anderet zum Essen" }) });
    expect(signal.aborted).toBe(true);
    reply.resolve(answer("quarkwolke"));
    await flushPromises();
    expect(w.text()).not.toContain("Passt vielleicht");
  });

  it("discards stale answer", async () => {
    const reply = deferred<string>();
    model(() => reply.promise); // ignores the signal: the answer still arrives
    const w = mountBlock();
    await start(w);
    await w.setProps({ state: state({ q: "zwei Worte" }) });
    reply.resolve(answer("quarkwolke"));
    await flushPromises();
    expect(w.text()).not.toContain("Passt vielleicht");
    expect(w.find('[role="option"]').exists()).toBe(false);
  });

  it("create rejects → error state", async () => {
    const m = model(async () => answer("quarkwolke"));
    m.create.mockRejectedValue(new Error("no model"));
    const w = mountBlock();
    await start(w);
    expect(w.text()).toContain("Hat nich jeklappt");
    expect(mocks.reportError).toHaveBeenCalledOnce();
    expect(w.find("progress").exists()).toBe(false);

    m.create.mockImplementation(async () => m.base);
    await button(w, "Nochmal versuchen").trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Passt vielleicht");
  });

  it("AbortError → no error state", async () => {
    // Own abort (Abbrechen): silent, the block closes.
    const reply = deferred<string>();
    model((_, o) => {
      o.signal.addEventListener("abort", () =>
        reply.reject(new DOMException("stopped", "AbortError")),
      );
      return reply.promise;
    });
    const w = mountBlock();
    await start(w);
    await button(w, "Abbrechen").trigger("click");
    await flushPromises();
    expect(w.text()).not.toContain("Hat nich jeklappt");
    expect(w.find("progress").exists()).toBe(false);
    expect(mocks.reportError).not.toHaveBeenCalled();
  });

  it("an AbortError from Chrome itself shows the error state without a report", async () => {
    model(async () => {
      throw new DOMException("session destroyed", "AbortError");
    });
    const w = mountBlock();
    await start(w);
    expect(w.text()).toContain("Hat nich jeklappt");
    expect(mocks.reportError).not.toHaveBeenCalled();
  });

  it("no candidates are not cached: the next run asks the model", async () => {
    const { clone } = model(async () => answer("quarkwolke"));
    const find = vi.fn().mockResolvedValueOnce([]).mockResolvedValue(words);
    const w = mountBlock({ find });
    await start(w);
    expect(w.text()).toContain("Nüscht Passendet jefunden");
    await start(w);
    expect(clone.prompt).toHaveBeenCalledOnce();
    expect(w.text()).toContain("Passt vielleicht");
  });

  it("failing candidates show the error state, not zu wenig", async () => {
    model(async () => answer("quarkwolke"));
    const w = mountBlock({ find: async () => Promise.reject(new Error("no index")) });
    await start(w);
    expect(w.text()).toContain("Hat nich jeklappt");
    expect(w.text()).not.toContain("Nüscht Passendet");
  });

  it("the offer on load pre-warms an available model", () => {
    const { create } = model(async () => answer("quarkwolke"));
    mountBlock();
    expect(create).toHaveBeenCalledOnce();
  });

  it("clones per request and reuses the base", async () => {
    const { base, clone, create } = model(async () => answer("quarkwolke"));
    const w = mountBlock();
    await start(w);
    await w.setProps({ state: state({ q: "wat anderet zum Essen" }) });
    await start(w);
    expect(create).toHaveBeenCalledOnce();
    expect(base.clone).toHaveBeenCalledTimes(2);
    expect(clone.destroy).toHaveBeenCalledTimes(2);

    w.unmount();
    await flushPromises();
    expect(base.destroy).toHaveBeenCalledOnce();
  });

  it("the same request is answered from the session cache", async () => {
    const { clone } = model(async () => answer("quarkwolke"));
    await start(mountBlock());
    const again = mountBlock();
    await start(again);
    expect(clone.prompt).toHaveBeenCalledOnce();
    expect(again.text()).toContain("Passt vielleicht: 1 Wort nach Bedeutung");
  });

  it("few candidates → zu wenig, no prompt", async () => {
    const { clone } = model(async () => answer("quarkwolke"));
    const w = mountBlock({ find: async () => [] });
    await start(w);
    expect(w.text()).toContain("Nüscht Passendet jefunden");
    expect(clone.prompt).not.toHaveBeenCalled();
  });

  it("Nee, danke hides the offer for the session but the button still starts", async () => {
    model(async () => answer("quarkwolke"));
    const w = mountBlock();
    expect(w.text()).toContain("Dit klingt nach ’ner Beschreibung");
    await button(w, "Nee, danke").trigger("click");
    expect(w.text()).not.toContain("Dit klingt nach");

    const later = mountBlock();
    expect(later.text()).not.toContain("Dit klingt nach");
    await start(later);
    expect(later.text()).toContain("Passt vielleicht");
  });

  it("no offer under 3 words", () => {
    model(async () => answer("quarkwolke"));
    expect(mountBlock({ state: state({ q: "zwei Worte" }) }).text()).not.toContain("Dit klingt");
  });
});
