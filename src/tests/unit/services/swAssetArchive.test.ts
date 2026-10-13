// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

const SCRIPT = readFileSync("public/sw-asset-archive.js", "utf8");
const ORIGIN = "https://berliner-schnauze.wtf";

type Listener = (event: unknown) => void;

// Minimal Cache Storage: keys() keeps insertion order, a re-put moves the entry to the end.
function createCaches(initial: Record<string, string[]>) {
  const stores = new Map<string, Map<string, Response>>();
  const open = async (name: string) => {
    const store = stores.get(name) ?? new Map<string, Response>();
    stores.set(name, store);
    return {
      delete: async (req: Request) => store.delete(req.url),
      keys: async () => [...store.keys()].map((url) => new Request(url)),
      match: async (req: Request) => store.get(req.url)?.clone(),
      put: async (req: Request, res: Response) => {
        store.delete(req.url);
        store.set(req.url, res);
      },
    };
  };
  for (const [name, paths] of Object.entries(initial)) {
    const store = new Map<string, Response>();
    for (const path of paths) store.set(ORIGIN + path, new Response(path));
    stores.set(name, store);
  }
  return { keys: async () => [...stores.keys()], open, stores };
}

async function install(caches: ReturnType<typeof createCaches>, { active = false } = {}) {
  const listeners = new Map<string, Listener>();
  const skipWaiting = vi.fn().mockResolvedValue(undefined);
  const self = {
    addEventListener: (type: string, fn: Listener) => listeners.set(type, fn),
    registration: { active: active ? {} : null },
    skipWaiting,
  };
  // oxlint-disable-next-line typescript/no-implied-eval -- evaluates the SW script in a fake global scope
  new Function("self", "caches", SCRIPT)(self, caches);
  let done: Promise<unknown> = Promise.resolve();
  listeners.get("install")?.({ waitUntil: (p: Promise<unknown>) => (done = p) });
  await done;
  return { skipWaiting };
}

const archived = (caches: ReturnType<typeof createCaches>) =>
  [...(caches.stores.get("astro-assets-archive")?.keys() ?? [])].map(
    (url) => new URL(url).pathname,
  );

describe("sw-asset-archive.js", () => {
  it("copies the outgoing precache's /_astro/ files into the archive on install", async () => {
    const caches = createCaches({
      pages: ["/wort/wa"],
      "workbox-precache-v2-https://berliner-schnauze.wtf/": [
        "/_astro/MainMenu.OLD.js",
        "/_astro/index.OLD.css",
        "/settings?__WB_REVISION__=abc",
        "/favicons/favicon.svg?__WB_REVISION__=def",
      ],
    });
    await install(caches);
    expect(archived(caches)).toEqual(["/_astro/MainMenu.OLD.js", "/_astro/index.OLD.css"]);
    const body = await (
      await caches.open("astro-assets-archive")
    )
      .match(new Request(`${ORIGIN}/_astro/MainMenu.OLD.js`))
      .then((r) => r?.text());
    expect(body).toBe("/_astro/MainMenu.OLD.js");
  });

  it("keeps the newest entries and drops the oldest beyond the cap", async () => {
    const old = Array.from({ length: 700 }, (_, i) => `/_astro/old-${i}.js`);
    const caches = createCaches({
      "astro-assets-archive": old,
      "workbox-precache-v2-x": ["/_astro/current.js"],
    });
    await install(caches);
    const kept = archived(caches);
    expect(kept).toHaveLength(600);
    expect(kept.at(-1)).toBe("/_astro/current.js");
    expect(kept[0]).toBe("/_astro/old-101.js");
  });

  it("does nothing without a precache (first install)", async () => {
    const caches = createCaches({});
    const { skipWaiting } = await install(caches);
    expect(archived(caches)).toEqual([]);
    expect(skipWaiting).not.toHaveBeenCalled();
  });

  // The archive only exists once a SW with this script installed. An active SW without it
  // is from the autoUpdate era: its pages only react to "activated", never to a waiting SW.
  it("takes over once from an autoUpdate-era SW (active, no archive yet)", async () => {
    const caches = createCaches({ "workbox-precache-v2-x": ["/_astro/old.js"] });
    const { skipWaiting } = await install(caches, { active: true });
    expect(skipWaiting).toHaveBeenCalledOnce();
    expect(archived(caches)).toEqual(["/_astro/old.js"]);
  });

  it("waits behind a SW that already has the archive", async () => {
    const caches = createCaches({ "astro-assets-archive": [], "workbox-precache-v2-x": [] });
    const { skipWaiting } = await install(caches, { active: true });
    expect(skipWaiting).not.toHaveBeenCalled();
  });
});
