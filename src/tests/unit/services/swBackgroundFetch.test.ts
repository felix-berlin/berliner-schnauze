// @vitest-environment node
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const SCRIPT = readFileSync("public/sw-background-fetch.js", "utf8");
const ORIGIN = "https://berliner-schnauze.wtf";

type Listener = (event: unknown) => void;

function setup() {
  const listeners = new Map<string, Listener>();
  const store = new Map<string, Response>();
  const cache = {
    put: vi.fn(async (req: Request, res: Response) => {
      store.set(new URL(req.url).pathname, res);
    }),
  };
  const client = { postMessage: vi.fn() };
  const self = {
    addEventListener: (type: string, fn: Listener) => listeners.set(type, fn),
    clients: {
      matchAll: vi.fn().mockResolvedValue([client]),
      openWindow: vi.fn().mockResolvedValue(undefined),
    },
  };
  const caches = { open: vi.fn().mockResolvedValue(cache) };
  // oxlint-disable-next-line typescript/no-implied-eval -- evaluates the SW script in a fake global scope
  new Function("self", "caches", SCRIPT)(self, caches);

  async function fire(type: string, registration: object) {
    let done: Promise<unknown> = Promise.resolve();
    const updateUI = vi.fn().mockResolvedValue(undefined);
    listeners.get(type)?.({
      registration,
      updateUI,
      waitUntil: (p: Promise<unknown>) => (done = p),
    });
    await done;
    return { updateUI };
  }

  return { cache, caches, client, fire, self, store };
}

function record(path: string, response: Response | Promise<Response>) {
  return { request: new Request(ORIGIN + path), responseReady: Promise.resolve(response) };
}

function registration(id: string, records: ReturnType<typeof record>[]) {
  return { id, matchAll: vi.fn().mockResolvedValue(records) };
}

describe("sw-background-fetch.js", () => {
  let env: ReturnType<typeof setup>;
  beforeEach(() => {
    env = setup();
  });

  it("success: caches ok records with the version header and notifies clients", async () => {
    const reg = registration("offline-dictionary@9.9.9", [
      record("/wort/aasen", new Response("<h1>aasen</h1>", { status: 200 })),
      record("/wort/weg", new Response("gone", { status: 404 })),
    ]);
    const { updateUI } = await env.fire("backgroundfetchsuccess", reg);

    expect([...env.store.keys()]).toEqual(["/wort/aasen"]);
    expect(env.store.get("/wort/aasen")?.headers.get("x-offline-dictionary-version")).toBe("9.9.9");
    expect(await env.store.get("/wort/aasen")?.text()).toBe("<h1>aasen</h1>");
    expect(updateUI).toHaveBeenCalledWith({ title: "Offline-Wörterbuch bereit" });
    expect(env.client.postMessage).toHaveBeenCalledWith({
      id: "offline-dictionary@9.9.9",
      result: "success",
      stored: 1,
      type: "offline-dictionary",
    });
  });

  it("success: reports fail when a write throws mid-loop (e.g. QuotaExceededError)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    env.cache.put
      .mockImplementationOnce(async (req: Request, res: Response) => {
        env.store.set(new URL(req.url).pathname, res);
      })
      .mockImplementationOnce(() => {
        throw new DOMException("quota exceeded", "QuotaExceededError");
      });
    const reg = registration("offline-dictionary@1.0.0", [
      record("/wort/a", new Response("a", { status: 200 })),
      record("/wort/b", new Response("b", { status: 200 })),
      record("/wort/c", new Response("c", { status: 200 })),
    ]);
    const { updateUI } = await env.fire("backgroundfetchsuccess", reg);

    expect([...env.store.keys()]).toEqual(["/wort/a"]);
    expect(env.cache.put).toHaveBeenCalledTimes(2);
    expect(updateUI).toHaveBeenCalledWith({ title: "Offline-Wörterbuch unvollständig" });
    expect(env.client.postMessage).toHaveBeenCalledWith({
      id: "offline-dictionary@1.0.0",
      result: "fail",
      stored: 1,
      type: "offline-dictionary",
    });
    expect(consoleError).toHaveBeenCalledWith("[sw-background-fetch]", expect.any(DOMException));
    consoleError.mockRestore();
  });

  it("skips redirected responses (unusable for navigations)", async () => {
    const redirected = new Response("x", { status: 200 });
    Object.defineProperty(redirected, "redirected", { value: true });
    const reg = registration("offline-dictionary@1.0.0", [record("/wort/a", redirected)]);
    await env.fire("backgroundfetchsuccess", reg);
    expect(env.store.size).toBe(0);
  });

  it("fail: still caches the successful records and reports fail", async () => {
    const reg = registration("offline-dictionary@1.0.0", [
      record("/wort/a", new Response("a", { status: 200 })),
      { request: new Request(ORIGIN + "/wort/b"), responseReady: Promise.reject(new Error("x")) },
    ]);
    await env.fire("backgroundfetchfail", reg);
    expect([...env.store.keys()]).toEqual(["/wort/a"]);
    expect(env.client.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: "offline-dictionary@1.0.0", result: "fail", stored: 1 }),
    );
  });

  it("abort: caches nothing, reports abort", async () => {
    const reg = registration("offline-dictionary@1.0.0", [
      record("/wort/a", new Response("a", { status: 200 })),
    ]);
    await env.fire("backgroundfetchabort", reg);
    expect(env.store.size).toBe(0);
    expect(reg.matchAll).not.toHaveBeenCalled();
    expect(env.client.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: "offline-dictionary@1.0.0", result: "abort" }),
    );
  });

  it("click: opens the cache settings", async () => {
    await env.fire("backgroundfetchclick", registration("offline-dictionary@1.0.0", []));
    expect(env.self.clients.openWindow).toHaveBeenCalledWith("/settings/cache");
  });

  it("ignores foreign background fetches", async () => {
    const reg = registration("something-else", [record("/x", new Response("x"))]);
    await env.fire("backgroundfetchsuccess", reg);
    expect(env.caches.open).not.toHaveBeenCalled();
  });
});
