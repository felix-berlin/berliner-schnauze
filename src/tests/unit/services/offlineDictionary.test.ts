import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { version } from "../../../../package.json";

vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@services/storagePersistence", () => ({
  requestPersistentStorage: vi.fn().mockResolvedValue("persisted"),
}));

const ORIGIN = "https://berliner-schnauze.wtf";
const SLUGS = ["aasen", "anmachen", "wa", "alex", "bulette", "icke"];

// ── fakes ─────────────────────────────────────────────────────────────────────

function createFakeCaches() {
  const stores = new Map<string, Map<string, Response>>();
  const path = (r: RequestInfo | URL) =>
    new URL(typeof r === "string" ? r : r instanceof URL ? r.href : r.url, ORIGIN).pathname;
  const putError: { value: Error | null } = { value: null };
  // Artificial delays to widen the async gaps that the N1/N2 regression tests pause/
  // cancel into (caches.open resolving, cache.put mid-write).
  const openDelay: { value: number } = { value: 0 };
  const putDelay: { value: number } = { value: 0 };
  const open = vi.fn(async (name: string) => {
    if (openDelay.value > 0) await new Promise((r) => setTimeout(r, openDelay.value));
    const store = stores.get(name) ?? new Map<string, Response>();
    stores.set(name, store);
    return {
      delete: async (r: RequestInfo) => store.delete(path(r)),
      keys: async () => [...store.keys()].map((p) => new Request(ORIGIN + p)),
      match: async (r: RequestInfo) => store.get(path(r))?.clone(),
      put: async (r: RequestInfo, res: Response) => {
        if (putDelay.value > 0) await new Promise((resolve) => setTimeout(resolve, putDelay.value));
        if (putError.value) throw putError.value;
        store.set(path(r), res);
      },
    };
  });
  return { open, openDelay, putDelay, putError, stores };
}

function pageResponse(body = "<html></html>", status = 200) {
  return new Response(body, { headers: { "content-type": "text/html" }, status });
}

let fakeCaches: ReturnType<typeof createFakeCaches>;
let fetchMock: ReturnType<typeof vi.fn>;
let connection: (EventTarget & { saveData?: boolean; type?: string }) | undefined;

function setConnection(value: typeof connection) {
  connection = value;
  Object.defineProperty(navigator, "connection", { configurable: true, value });
}

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

// Each test does vi.resetModules() and re-imports the service, which re-attaches its
// module-level `window.addEventListener("online", ...)` listener (see attachListeners()
// in offlineDictionary.ts). Without cleanup, listeners from earlier test's module
// instances stay attached to jsdom's shared `window` and can fire on later tests'
// "online" events, racing against that test's own fakes. Track and remove them here.
const windowListeners: Array<[string, EventListenerOrEventListenerObject]> = [];

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  fakeCaches = createFakeCaches();
  vi.stubGlobal("caches", fakeCaches);
  fetchMock = vi.fn(async (url: string) =>
    url === "/api/search/index.json"
      ? new Response(JSON.stringify(SLUGS.map((slug) => ({ slug }))))
      : pageResponse(`<h1>${url}</h1>`),
  );
  vi.stubGlobal("fetch", fetchMock);
  setConnection(undefined);
  setOnline(true);
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: undefined });
  windowListeners.length = 0;
  const originalAddEventListener = window.addEventListener.bind(window);
  vi.spyOn(window, "addEventListener").mockImplementation((type, listener, options) => {
    windowListeners.push([type, listener as EventListenerOrEventListenerObject]);
    originalAddEventListener(type, listener, options);
  });
});

afterEach(() => {
  for (const [type, listener] of windowListeners) window.removeEventListener(type, listener);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function load() {
  const mod = await import("@services/offlineDictionary");
  const settings = await import("@stores/pwaSettings.ts");
  return { ...mod, ...settings };
}

const pagesCache = () => fakeCaches.stores.get("pages") ?? new Map<string, Response>();

/** Word pages resolve slowly and reject with AbortError once their signal is aborted. */
function slowPages() {
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url === "/api/search/index.json") {
      return new Response(JSON.stringify(SLUGS.map((slug) => ({ slug }))));
    }
    return new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => resolve(pageResponse()), 50);
      init?.signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("aborted", "AbortError"));
      });
    });
  });
}

/** The search index resolves slowly and rejects with AbortError once its signal is aborted. */
function slowIndex() {
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url === "/api/search/index.json") {
      return new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(
          () => resolve(new Response(JSON.stringify(SLUGS.map((slug) => ({ slug }))))),
          50,
        );
        init?.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("aborted", "AbortError"));
        });
      });
    }
    return pageResponse();
  });
}

/**
 * Word pages resolve quickly (10ms) normally, but once a fetch's signal is aborted,
 * the rejection is delayed by `abortDelayMs` -- simulating a slow real cancellation so
 * a run started right after an abort can race ahead of the old run's settlement.
 */
function delayedAbortPages(abortDelayMs: number) {
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url === "/api/search/index.json") {
      return new Response(JSON.stringify(SLUGS.map((slug) => ({ slug }))));
    }
    return new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => resolve(pageResponse()), 30);
      init?.signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        setTimeout(() => reject(new DOMException("aborted", "AbortError")), abortDelayMs);
      });
    });
  });
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("offlineDictionary — url list", () => {
  it("getWordUrls maps search index slugs to /wort/<slug>", async () => {
    const { getWordUrls } = await load();
    expect(await getWordUrls()).toEqual(SLUGS.map((s) => `/wort/${s}`));
  });

  it("getWordUrls throws on a failed index request", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 503 }));
    const { getWordUrls } = await load();
    await expect(getWordUrls()).rejects.toThrow("503");
  });

  it("getMissingUrls skips pages cached for the current version only", async () => {
    const { getMissingUrls } = await load();
    const cache = await caches.open("pages");
    await cache.put(
      "/wort/aasen",
      new Response("x", { headers: { "x-offline-dictionary-version": version } }),
    );
    await cache.put(
      "/wort/wa",
      new Response("x", { headers: { "x-offline-dictionary-version": "0.0.1" } }),
    );
    await cache.put("/wort/alex", new Response("visited, no header"));
    expect(await getMissingUrls(["/wort/aasen", "/wort/wa", "/wort/alex", "/wort/icke"])).toEqual([
      "/wort/wa",
      "/wort/alex",
      "/wort/icke",
    ]);
  });

  it("estimateDownloadBytes = missing pages × average page size", async () => {
    const { AVG_PAGE_BYTES, estimateDownloadBytes } = await load();
    expect(await estimateDownloadBytes()).toBe(SLUGS.length * AVG_PAGE_BYTES);
  });
});

describe("offlineDictionary — in-page download", () => {
  it("caches every page with the version header and marks the version synced", async () => {
    const { $offlineDictionary, $offlineDictionaryProgress, startDownload } = await load();
    await startDownload({ manual: true });

    expect(pagesCache().size).toBe(SLUGS.length);
    expect(pagesCache().get("/wort/aasen")?.headers.get("x-offline-dictionary-version")).toBe(
      version,
    );
    expect($offlineDictionaryProgress.get()).toMatchObject({
      done: SLUGS.length,
      mode: "page",
      state: "done",
      total: SLUGS.length,
    });
    expect($offlineDictionaryProgress.get().bytes).toBeGreaterThan(0);
    expect($offlineDictionary.get().syncedVersion).toBe(version);
  });

  it("runs at most 4 page requests in parallel", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/search/index.json") {
        return new Response(JSON.stringify(SLUGS.map((slug) => ({ slug }))));
      }
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return pageResponse();
    });
    const { startDownload } = await load();
    await startDownload({ manual: true });
    expect(maxInFlight).toBe(4);
  });

  it("skips 404/410 and redirected responses without failing the run", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/search/index.json") {
        return new Response(JSON.stringify(SLUGS.map((slug) => ({ slug }))));
      }
      if (url === "/wort/wa") return pageResponse("", 404);
      if (url === "/wort/bulette") return pageResponse("", 410);
      if (url === "/wort/alex") {
        const res = pageResponse();
        Object.defineProperty(res, "redirected", { value: true });
        return res;
      }
      return pageResponse();
    });
    const { $offlineDictionaryProgress, startDownload } = await load();
    await startDownload({ manual: true });
    expect(pagesCache().has("/wort/wa")).toBe(false);
    expect(pagesCache().has("/wort/bulette")).toBe(false);
    expect(pagesCache().has("/wort/alex")).toBe(false);
    expect($offlineDictionaryProgress.get().state).toBe("done");
  });

  it("a transient 5xx response fails the run without marking the version synced", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/search/index.json") {
        return new Response(JSON.stringify(SLUGS.map((slug) => ({ slug }))));
      }
      if (url === "/wort/wa") return pageResponse("", 503);
      return pageResponse();
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { $offlineDictionary, $offlineDictionaryProgress, startDownload } = await load();
    await startDownload({ manual: true });
    expect($offlineDictionaryProgress.get().state).toBe("error");
    expect($offlineDictionary.get().syncedVersion).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("does not re-download pages already cached for this version", async () => {
    const cache = await caches.open("pages");
    await cache.put(
      "/wort/aasen",
      new Response("x", { headers: { "x-offline-dictionary-version": version } }),
    );
    const { startDownload } = await load();
    await startDownload({ manual: true });
    expect(fetchMock).not.toHaveBeenCalledWith("/wort/aasen", expect.anything());
  });

  it("dedupes concurrent startDownload calls", async () => {
    const { startDownload } = await load();
    await Promise.all([startDownload({ manual: true }), startDownload({ manual: true })]);
    expect(fetchMock.mock.calls.filter(([u]) => u === "/api/search/index.json")).toHaveLength(1);
  });

  it("storage full (QuotaExceededError) → state error, no retry", async () => {
    fakeCaches.putError.value = new DOMException("full", "QuotaExceededError");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { $offlineDictionary, $offlineDictionaryProgress, startDownload } = await load();
    await startDownload({ manual: true });
    expect($offlineDictionaryProgress.get().state).toBe("error");
    expect($offlineDictionary.get().syncedVersion).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("an error state ignores online/connection events but a manual start retries", async () => {
    fakeCaches.putError.value = new DOMException("full", "QuotaExceededError");
    vi.spyOn(console, "error").mockImplementation(() => {});
    setConnection(Object.assign(new EventTarget(), { type: "wifi" }));
    const { $offlineDictionaryProgress, patchOfflineDictionary, startDownload } = await load();
    patchOfflineDictionary({ enabled: true });
    await startDownload({ manual: true });
    expect($offlineDictionaryProgress.get().state).toBe("error");

    const callsBefore = fetchMock.mock.calls.length;
    window.dispatchEvent(new Event("online"));
    connection!.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
    expect($offlineDictionaryProgress.get().state).toBe("error");

    fakeCaches.putError.value = null;
    await startDownload({ manual: true });
    expect($offlineDictionaryProgress.get().state).toBe("done");
  });

  it("network loss mid-download → paused; online event resumes and completes", async () => {
    let failNext = true;
    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/search/index.json") {
        return new Response(JSON.stringify(SLUGS.map((slug) => ({ slug }))));
      }
      if (failNext && url === "/wort/wa") {
        failNext = false;
        setOnline(false);
        throw new TypeError("Failed to fetch");
      }
      return pageResponse();
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { $offlineDictionaryProgress, patchOfflineDictionary, startDownload } = await load();
    patchOfflineDictionary({ enabled: true });
    await startDownload();
    expect($offlineDictionaryProgress.get().state).toBe("paused");

    setOnline(true);
    window.dispatchEvent(new Event("online"));
    await vi.waitFor(() => expect($offlineDictionaryProgress.get().state).toBe("done"));
    expect(pagesCache().size).toBe(SLUGS.length);
  });
});

describe("offlineDictionary — gates", () => {
  it("wifiOnly on cellular → waiting, no requests; wifi change starts the download", async () => {
    setConnection(Object.assign(new EventTarget(), { type: "cellular" }));
    const { $offlineDictionaryProgress, patchOfflineDictionary, startDownload } = await load();
    patchOfflineDictionary({ enabled: true, wifiOnly: true });
    await startDownload({ manual: true });
    expect($offlineDictionaryProgress.get().state).toBe("waiting");
    expect(fetchMock).not.toHaveBeenCalled();

    connection!.type = "wifi";
    connection!.dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect($offlineDictionaryProgress.get().state).toBe("done"));
  });

  it("wifiOnly off → downloads on cellular", async () => {
    setConnection(Object.assign(new EventTarget(), { type: "cellular" }));
    const { $offlineDictionaryProgress, patchOfflineDictionary, startDownload } = await load();
    patchOfflineDictionary({ enabled: true, wifiOnly: false });
    await startDownload({ manual: true });
    expect($offlineDictionaryProgress.get().state).toBe("done");
  });

  it("no connection.type support → no wifi gate", async () => {
    const { getWaitReason, patchOfflineDictionary } = await load();
    patchOfflineDictionary({ wifiOnly: true });
    expect(getWaitReason(false)).toBeNull();
  });

  it("saveData blocks automatic starts but not manual ones", async () => {
    setConnection(Object.assign(new EventTarget(), { saveData: true }));
    const { getWaitReason } = await load();
    expect(getWaitReason(false)).toBe("data-saver");
    expect(getWaitReason(true)).toBeNull();
  });

  it("waiting carries its reason: wifi gate vs Data Saver", async () => {
    setConnection(Object.assign(new EventTarget(), { type: "cellular" }));
    const { $offlineDictionaryProgress, patchOfflineDictionary, startDownload } = await load();
    patchOfflineDictionary({ enabled: true, wifiOnly: true });
    await startDownload();
    expect($offlineDictionaryProgress.get()).toMatchObject({
      state: "waiting",
      waitReason: "wifi",
    });

    setConnection(Object.assign(new EventTarget(), { saveData: true, type: "wifi" }));
    await startDownload();
    expect($offlineDictionaryProgress.get()).toMatchObject({
      state: "waiting",
      waitReason: "data-saver",
    });
  });
});

describe("offlineDictionary — pause / cancel", () => {
  it("pauseDownload stops the run; online/connection change does not auto-resume", async () => {
    slowPages();
    setConnection(Object.assign(new EventTarget(), { type: "wifi" }));
    const { $offlineDictionaryProgress, patchOfflineDictionary, pauseDownload, startDownload } =
      await load();
    patchOfflineDictionary({ enabled: true });
    const run = startDownload({ manual: true });
    await vi.waitFor(() => expect($offlineDictionaryProgress.get().state).toBe("running"));
    pauseDownload();
    await run;
    expect($offlineDictionaryProgress.get().state).toBe("paused");

    const callsBefore = fetchMock.mock.calls.length;
    window.dispatchEvent(new Event("online"));
    connection!.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
    expect($offlineDictionaryProgress.get().state).toBe("paused");
  });

  it("cancelDownload stops the run; online/connection change does not auto-resume", async () => {
    slowPages();
    setConnection(Object.assign(new EventTarget(), { type: "wifi" }));
    const { $offlineDictionaryProgress, cancelDownload, patchOfflineDictionary, startDownload } =
      await load();
    patchOfflineDictionary({ enabled: true });
    const run = startDownload({ manual: true });
    await vi.waitFor(() => expect($offlineDictionaryProgress.get().state).toBe("running"));
    await cancelDownload();
    await run;
    expect($offlineDictionaryProgress.get().state).toBe("idle");

    const callsBefore = fetchMock.mock.calls.length;
    window.dispatchEvent(new Event("online"));
    connection!.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
    expect($offlineDictionaryProgress.get().state).toBe("idle");
  });

  it("a manual start after pause resumes", async () => {
    const { $offlineDictionaryProgress, pauseDownload, startDownload } = await load();
    pauseDownload();
    await startDownload({ manual: true });
    expect($offlineDictionaryProgress.get().state).toBe("done");
  });

  it("cancelDownload resets progress to idle", async () => {
    slowPages();
    const { $offlineDictionaryProgress, cancelDownload, startDownload } = await load();
    const run = startDownload({ manual: true });
    await vi.waitFor(() => expect($offlineDictionaryProgress.get().state).toBe("running"));
    await cancelDownload();
    await run;
    expect($offlineDictionaryProgress.get()).toMatchObject({ done: 0, state: "idle", total: 0 });
  });

  it("pause while the index request is pending → paused, no /wort/* fetches, nothing cached", async () => {
    slowIndex();
    const { $offlineDictionaryProgress, pauseDownload, startDownload } = await load();
    const run = startDownload({ manual: true });
    await new Promise((r) => setTimeout(r, 5)); // let the index request start
    pauseDownload();
    await run;
    expect($offlineDictionaryProgress.get().state).toBe("paused");
    expect(
      fetchMock.mock.calls.some(([u]) => typeof u === "string" && u.startsWith("/wort/")),
    ).toBe(false);
    expect(pagesCache().size).toBe(0);
  });

  it("disable while a download is running removes every cached page once it settles", async () => {
    slowPages();
    const {
      $offlineDictionaryProgress,
      disableOfflineDictionary,
      patchOfflineDictionary,
      startDownload,
    } = await load();
    patchOfflineDictionary({ enabled: true });
    const run = startDownload({ manual: true });
    await vi.waitFor(() => expect($offlineDictionaryProgress.get().state).toBe("running"));
    await disableOfflineDictionary();
    await run;
    expect([...pagesCache().keys()].filter((k) => k.startsWith("/wort/"))).toEqual([]);
  });

  it("pause during an active run then an immediate manual start resumes and completes", async () => {
    slowPages();
    const { $offlineDictionaryProgress, pauseDownload, startDownload } = await load();
    const first = startDownload({ manual: true });
    await vi.waitFor(() => expect($offlineDictionaryProgress.get().state).toBe("running"));
    pauseDownload();
    const second = startDownload({ manual: true });
    await Promise.all([first, second]);
    expect($offlineDictionaryProgress.get().state).toBe("done");
    expect(pagesCache().size).toBe(SLUGS.length);
  });

  it("cancel during an active run then an immediate enable resumes and completes", async () => {
    slowPages();
    const { $offlineDictionaryProgress, cancelDownload, enableOfflineDictionary, startDownload } =
      await load();
    const first = startDownload({ manual: true });
    await vi.waitFor(() => expect($offlineDictionaryProgress.get().state).toBe("running"));
    await cancelDownload();
    await first;
    // enableOfflineDictionary no longer awaits the download itself (it can run for
    // minutes) — wait for the reactive progress to reach "done" instead.
    await enableOfflineDictionary();
    await vi.waitFor(() => expect($offlineDictionaryProgress.get().state).toBe("done"));
    expect(pagesCache().size).toBe(SLUGS.length);
  });

  it("pause while downloadInPage's own caches.open is still resolving → paused, no /wort/* fetches", async () => {
    fakeCaches.openDelay.value = 15;
    const { $offlineDictionaryProgress, pauseDownload, startDownload } = await load();
    const run = startDownload({ manual: true });
    // Let getWordUrls settle and getMissingUrls's caches.open (1st call, ~15ms) resolve,
    // then pause while downloadInPage's own caches.open (2nd call) is still in flight.
    await new Promise((r) => setTimeout(r, 20));
    pauseDownload();
    await run;
    expect($offlineDictionaryProgress.get().state).toBe("paused");
    expect(
      fetchMock.mock.calls.some(([u]) => typeof u === "string" && u.startsWith("/wort/")),
    ).toBe(false);
    expect(pagesCache().size).toBe(0);
  });

  it("disable after pausing mid-write waits for in-flight cache.put calls before deleting", async () => {
    fakeCaches.putDelay.value = 30;
    const {
      $offlineDictionaryProgress,
      disableOfflineDictionary,
      pauseDownload,
      patchOfflineDictionary,
      startDownload,
    } = await load();
    patchOfflineDictionary({ enabled: true });
    const run = startDownload({ manual: true });
    await vi.waitFor(() => expect($offlineDictionaryProgress.get().state).toBe("running"));
    // Let the first batch of (up to CONCURRENCY) cache.put calls start before pausing.
    await new Promise((r) => setTimeout(r, 5));
    pauseDownload();
    await disableOfflineDictionary();
    await run;
    expect([...pagesCache().keys()].filter((k) => k.startsWith("/wort/"))).toEqual([]);
  });

  it("an online event during disable does not start a new run that refills /wort/*", async () => {
    slowPages();
    const {
      $offlineDictionaryProgress,
      disableOfflineDictionary,
      patchOfflineDictionary,
      startDownload,
    } = await load();
    patchOfflineDictionary({ enabled: true });
    const run = startDownload({ manual: true });
    await vi.waitFor(() => expect($offlineDictionaryProgress.get().state).toBe("running"));
    const disabling = disableOfflineDictionary();
    window.dispatchEvent(new Event("online")); // while disable is still awaiting the old run
    await disabling;
    await run;
    await new Promise((r) => setTimeout(r, 120)); // longer than a slow page takes
    expect(fetchMock.mock.calls.filter(([u]) => u === "/api/search/index.json")).toHaveLength(1);
    expect([...pagesCache().keys()].filter((k) => k.startsWith("/wort/"))).toEqual([]);
  });

  it("a run started while cancelDownload is still awaiting the old one keeps its own progress", async () => {
    // The first run's fetches resolve fast, but its abort takes 60ms to settle,
    // giving the fresh second run (unaffected by that abort) time to reach "done"
    // first — the old bug then had cancelDownload's delayed IDLE reset land after,
    // wiping the second run's legitimate "done" state.
    delayedAbortPages(150);
    const { $offlineDictionaryProgress, cancelDownload, startDownload } = await load();
    const first = startDownload({ manual: true });
    await vi.waitFor(() => expect($offlineDictionaryProgress.get().state).toBe("running"));
    const cancelling = cancelDownload();
    const second = startDownload({ manual: true }); // started before `cancelling` resolves
    await Promise.all([first, cancelling, second]);
    expect($offlineDictionaryProgress.get().state).toBe("done");
    expect(pagesCache().size).toBe(SLUGS.length);
  });
});

describe("offlineDictionary — lifecycle", () => {
  it("enable: persists setting, requests persistent storage, downloads", async () => {
    const { $offlineDictionary, $offlineDictionaryProgress, enableOfflineDictionary } =
      await load();
    const { requestPersistentStorage } = await import("@services/storagePersistence");
    await enableOfflineDictionary();
    expect($offlineDictionary.get().enabled).toBe(true);
    expect(requestPersistentStorage).toHaveBeenCalledOnce();
    // enableOfflineDictionary resolves as soon as the download is *started*, not
    // finished — wait for the reactive progress to reach "done".
    await vi.waitFor(() => expect($offlineDictionaryProgress.get().state).toBe("done"));
  });

  it("disable: removes /wort/* from pages, keeps other pages, resets settings", async () => {
    const cache = await caches.open("pages");
    await cache.put("/wort/aasen", new Response("x"));
    await cache.put("/magazin/post", new Response("x"));
    const { $offlineDictionary, disableOfflineDictionary, patchOfflineDictionary } = await load();
    patchOfflineDictionary({ enabled: true, syncedVersion: version });
    await disableOfflineDictionary();
    expect([...pagesCache().keys()]).toEqual(["/magazin/post"]);
    expect($offlineDictionary.get()).toMatchObject({ enabled: false, syncedVersion: null });
  });

  it("an error persists failedVersion: a later app start does not retry, a manual start does", async () => {
    fakeCaches.putError.value = new DOMException("full", "QuotaExceededError");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const first = await load();
    await first.enableOfflineDictionary();
    await vi.waitFor(() => expect(first.$offlineDictionaryProgress.get().state).toBe("error"));
    expect(first.$offlineDictionary.get().failedVersion).toBe(version);

    vi.resetModules(); // simulated app start: fresh module state, persisted settings
    fakeCaches.putError.value = null;
    const second = await load();
    const callsBefore = fetchMock.mock.calls.length;
    await second.resumeIfNeeded();
    expect(fetchMock.mock.calls.length).toBe(callsBefore);

    await second.startDownload({ manual: true });
    expect(second.$offlineDictionaryProgress.get().state).toBe("done");
    expect(second.$offlineDictionary.get().failedVersion).toBeNull();
  });

  it("resumeIfNeeded: no-op when disabled", async () => {
    const { resumeIfNeeded } = await load();
    await resumeIfNeeded();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resumeIfNeeded: no-op when synced for the current version", async () => {
    const { patchOfflineDictionary, resumeIfNeeded } = await load();
    patchOfflineDictionary({ enabled: true, syncedVersion: version });
    await resumeIfNeeded();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resumeIfNeeded: re-syncs after an app update", async () => {
    const { $offlineDictionary, patchOfflineDictionary, resumeIfNeeded } = await load();
    patchOfflineDictionary({ enabled: true, syncedVersion: "0.0.1" });
    await resumeIfNeeded();
    expect($offlineDictionary.get().syncedVersion).toBe(version);
  });
});

describe("offlineDictionary — Background Fetch", () => {
  type FakeBgFetch = EventTarget & {
    abort: ReturnType<typeof vi.fn>;
    downloaded: number;
    downloadTotal: number;
    id: string;
  };

  function makeBgFetch(id: string): FakeBgFetch {
    return Object.assign(new EventTarget(), {
      abort: vi.fn().mockResolvedValue(true),
      downloadTotal: 0,
      downloaded: 0,
      id,
    });
  }

  function installServiceWorker(manager: object) {
    const sw = Object.assign(new EventTarget(), {
      getRegistration: vi.fn().mockResolvedValue({ backgroundFetch: manager }),
    });
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: sw });
    return sw;
  }

  function makeManager(overrides: Record<string, unknown> = {}) {
    const bgFetch = makeBgFetch(`offline-dictionary@${version}`);
    const manager = {
      fetch: vi.fn().mockResolvedValue(bgFetch),
      get: vi.fn().mockResolvedValue(undefined),
      getIds: vi.fn().mockResolvedValue([]),
      ...overrides,
    };
    return { bgFetch, manager };
  }

  const pageFetches = () => fetchMock.mock.calls.filter(([u]) => String(u).startsWith("/wort/"));

  const swMessage = (result: string, stored = 0, id = `offline-dictionary@${version}`) =>
    new MessageEvent("message", { data: { id, result, stored, type: "offline-dictionary" } });

  it("starts a background fetch with the missing urls instead of fetching in the page", async () => {
    const { manager } = makeManager();
    installServiceWorker(manager);
    const { $offlineDictionaryProgress, BG_FETCH_ID, startDownload } = await load();
    await startDownload({ manual: true });

    expect(manager.fetch).toHaveBeenCalledWith(
      BG_FETCH_ID,
      SLUGS.map((s) => `/wort/${s}`),
      expect.objectContaining({ title: "Berliner Schnauze – Offline-Wörterbuch" }),
    );
    // downloadTotal must not be passed: Chrome fails the fetch if the estimate is exceeded
    expect(manager.fetch.mock.calls[0][2]).not.toHaveProperty("downloadTotal");
    expect(pageFetches()).toHaveLength(0);
    expect($offlineDictionaryProgress.get()).toMatchObject({
      mode: "background-fetch",
      state: "running",
    });
  });

  it("progress events update bytes and estimated done", async () => {
    const { bgFetch, manager } = makeManager();
    installServiceWorker(manager);
    const { $offlineDictionaryProgress, AVG_PAGE_BYTES, startDownload } = await load();
    await startDownload({ manual: true });

    bgFetch.downloaded = AVG_PAGE_BYTES * 2;
    bgFetch.dispatchEvent(new Event("progress"));
    expect($offlineDictionaryProgress.get()).toMatchObject({ bytes: AVG_PAGE_BYTES * 2, done: 2 });
  });

  it("SW success message → done and synced", async () => {
    const { manager } = makeManager();
    const sw = installServiceWorker(manager);
    const {
      $offlineDictionary,
      $offlineDictionaryProgress,
      patchOfflineDictionary,
      startDownload,
    } = await load();
    patchOfflineDictionary({ enabled: true }); // messages while disabled only trigger a wipe
    await startDownload({ manual: true });

    sw.dispatchEvent(
      new MessageEvent("message", {
        data: {
          id: `offline-dictionary@${version}`,
          result: "success",
          stored: SLUGS.length,
          type: "offline-dictionary",
        },
      }),
    );
    expect($offlineDictionaryProgress.get().state).toBe("done");
    expect($offlineDictionary.get().syncedVersion).toBe(version);
  });

  it("SW fail message → in-page run for the still-missing pages (404 skipped) → done", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/search/index.json") {
        return new Response(JSON.stringify(SLUGS.map((slug) => ({ slug }))));
      }
      if (url === "/wort/wa") return pageResponse("", 404); // removed word failed the bg fetch
      return pageResponse();
    });
    const { manager } = makeManager();
    const sw = installServiceWorker(manager);
    const {
      $offlineDictionary,
      $offlineDictionaryProgress,
      patchOfflineDictionary,
      startDownload,
    } = await load();
    patchOfflineDictionary({ enabled: true });
    await startDownload({ manual: true });
    // The SW stored what it got before reporting fail.
    const cache = await caches.open("pages");
    for (const slug of ["aasen", "anmachen"]) {
      await cache.put(
        `/wort/${slug}`,
        new Response("x", { headers: { "x-offline-dictionary-version": version } }),
      );
    }
    sw.dispatchEvent(swMessage("fail", 2));
    await vi.waitFor(() =>
      expect($offlineDictionaryProgress.get()).toMatchObject({ mode: "page", state: "done" }),
    );
    expect(pageFetches().map(([u]) => u)).toEqual([
      "/wort/wa",
      "/wort/alex",
      "/wort/bulette",
      "/wort/icke",
    ]);
    expect(pagesCache().has("/wort/wa")).toBe(false);
    expect(manager.fetch).toHaveBeenCalledOnce(); // no loop back into Background Fetch
    expect($offlineDictionary.get().syncedVersion).toBe(version);
  });

  it("a fail after the user paused does not start the in-page handover", async () => {
    const { manager } = makeManager();
    const sw = installServiceWorker(manager);
    const { $offlineDictionaryProgress, patchOfflineDictionary, pauseDownload, startDownload } =
      await load();
    patchOfflineDictionary({ enabled: true });
    await startDownload({ manual: true });
    pauseDownload();
    sw.dispatchEvent(swMessage("fail", 1));
    await new Promise((r) => setTimeout(r, 20));
    expect($offlineDictionaryProgress.get().state).toBe("paused");
    expect(pageFetches()).toHaveLength(0);
  });

  it("an untracked fail after cancel starts nothing; the next manual start goes in-page", async () => {
    const { bgFetch, manager } = makeManager();
    bgFetch.abort.mockResolvedValue(false); // fetch already completed, SW is storing
    const sw = installServiceWorker(manager);
    const { $offlineDictionaryProgress, cancelDownload, patchOfflineDictionary, startDownload } =
      await load();
    patchOfflineDictionary({ enabled: true });
    await startDownload({ manual: true });
    await cancelDownload();
    sw.dispatchEvent(swMessage("fail", 1));
    await new Promise((r) => setTimeout(r, 20));
    expect($offlineDictionaryProgress.get().state).toBe("idle");
    expect(pageFetches()).toHaveLength(0);

    await startDownload({ manual: true });
    expect(manager.fetch).toHaveBeenCalledOnce(); // bgFetchFailed honored
    expect(pageFetches()).toHaveLength(SLUGS.length);
    expect($offlineDictionaryProgress.get()).toMatchObject({ mode: "page", state: "done" });
  });

  it("a stale older-version abort message does not touch the tracked fetch", async () => {
    const { manager } = makeManager();
    const sw = installServiceWorker(manager);
    const { $offlineDictionaryProgress, patchOfflineDictionary, startDownload } = await load();
    patchOfflineDictionary({ enabled: true });
    await startDownload({ manual: true });
    sw.dispatchEvent(swMessage("abort", 0, "offline-dictionary@0.0.1"));
    expect($offlineDictionaryProgress.get()).toMatchObject({
      mode: "background-fetch",
      state: "running",
    });
  });

  it("a SW message after disable wipes /wort/* the SW stored after the disable wipe", async () => {
    const { bgFetch, manager } = makeManager();
    bgFetch.abort.mockResolvedValue(false); // fetch already completed, SW is storing
    const sw = installServiceWorker(manager);
    const { disableOfflineDictionary, patchOfflineDictionary, startDownload } = await load();
    patchOfflineDictionary({ enabled: true });
    await startDownload({ manual: true });
    await disableOfflineDictionary();
    const cache = await caches.open("pages");
    await cache.put("/wort/aasen", new Response("x"));
    await cache.put("/magazin/post", new Response("x"));
    sw.dispatchEvent(swMessage("success", 1));
    await vi.waitFor(() => expect([...pagesCache().keys()]).toEqual(["/magazin/post"]));
  });

  it("re-attaches before the wifi gate: a reload on cellular shows the running fetch", async () => {
    setConnection(Object.assign(new EventTarget(), { type: "cellular" }));
    const existing = makeBgFetch(`offline-dictionary@${version}`);
    const { manager } = makeManager({ get: vi.fn().mockResolvedValue(existing) });
    installServiceWorker(manager);
    const { $offlineDictionaryProgress, patchOfflineDictionary, startDownload } = await load();
    patchOfflineDictionary({ enabled: true, wifiOnly: true });
    await startDownload();
    expect(manager.fetch).not.toHaveBeenCalled();
    expect(pageFetches()).toHaveLength(0);
    expect($offlineDictionaryProgress.get()).toMatchObject({
      mode: "background-fetch",
      state: "running",
      total: SLUGS.length,
    });
  });

  it("closed wifi gate + the fetch finished before re-attaching → waiting, nothing started", async () => {
    setConnection(Object.assign(new EventTarget(), { type: "cellular" }));
    const existing = makeBgFetch(`offline-dictionary@${version}`);
    const { manager } = makeManager({
      get: vi.fn().mockResolvedValueOnce(existing).mockResolvedValue(undefined),
    });
    installServiceWorker(manager);
    const { $offlineDictionaryProgress, patchOfflineDictionary, startDownload } = await load();
    patchOfflineDictionary({ enabled: true, wifiOnly: true });
    await startDownload();
    expect(manager.fetch).not.toHaveBeenCalled();
    expect(pageFetches()).toHaveLength(0);
    expect($offlineDictionaryProgress.get().state).toBe("waiting");
  });

  it("falls back to the in-page download when backgroundFetch.fetch rejects", async () => {
    const { manager } = makeManager({ fetch: vi.fn().mockRejectedValue(new TypeError("quota")) });
    installServiceWorker(manager);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { $offlineDictionaryProgress, startDownload } = await load();
    await startDownload({ manual: true });
    expect(pageFetches()).toHaveLength(SLUGS.length);
    expect($offlineDictionaryProgress.get()).toMatchObject({ mode: "page", state: "done" });
  });

  it("re-attaches to a running fetch with the same id instead of starting a new one", async () => {
    const existing = makeBgFetch(`offline-dictionary@${version}`);
    const { manager } = makeManager({ get: vi.fn().mockResolvedValue(existing) });
    installServiceWorker(manager);
    const { $offlineDictionaryProgress, startDownload } = await load();
    await startDownload();
    expect(manager.fetch).not.toHaveBeenCalled();
    expect($offlineDictionaryProgress.get()).toMatchObject({
      mode: "background-fetch",
      state: "running",
    });
  });

  it("aborts a stale fetch from an older app version", async () => {
    const stale = makeBgFetch("offline-dictionary@0.0.1");
    const { manager } = makeManager({
      get: vi.fn(async (id: string) => (id === stale.id ? stale : undefined)),
      getIds: vi.fn().mockResolvedValue([stale.id]),
    });
    installServiceWorker(manager);
    const { startDownload } = await load();
    await startDownload({ manual: true });
    expect(stale.abort).toHaveBeenCalledOnce();
    expect(manager.fetch).toHaveBeenCalledOnce();
  });

  it("disable during a running background fetch aborts it before deleting pages", async () => {
    const { bgFetch, manager } = makeManager();
    installServiceWorker(manager);
    const { disableOfflineDictionary, startDownload } = await load();
    await startDownload({ manual: true });
    await disableOfflineDictionary();
    expect(bgFetch.abort).toHaveBeenCalledOnce();
  });

  it("disable also aborts a fetch nothing tracks (app start, before the resume run re-attached)", async () => {
    const untracked = makeBgFetch(`offline-dictionary@${version}`);
    const { manager } = makeManager({
      get: vi.fn().mockResolvedValue(untracked),
      getIds: vi.fn().mockResolvedValue([untracked.id]),
    });
    installServiceWorker(manager);
    const { disableOfflineDictionary, patchOfflineDictionary } = await load();
    patchOfflineDictionary({ enabled: true });
    await disableOfflineDictionary();
    expect(untracked.abort).toHaveBeenCalledOnce();
  });

  it("startDownload is a no-op while a background fetch is tracked", async () => {
    const { manager } = makeManager();
    installServiceWorker(manager);
    const { startDownload } = await load();
    await startDownload({ manual: true });
    const callsBefore = fetchMock.mock.calls.length;
    await startDownload({ manual: true });
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
    expect(manager.fetch).toHaveBeenCalledOnce();
  });

  it("cancel while backgroundFetch.fetch is pending aborts the fetch it resolves to", async () => {
    const { bgFetch, manager } = makeManager();
    // Resolved by hand: a timer would race vi.waitFor's polling and resolve before the cancel.
    let resolveFetch!: (value: typeof bgFetch) => void;
    manager.fetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    installServiceWorker(manager);
    const { $offlineDictionaryProgress, cancelDownload, startDownload } = await load();
    const run = startDownload({ manual: true });
    await vi.waitFor(() => expect(manager.fetch).toHaveBeenCalled());
    const cancelled = cancelDownload();
    resolveFetch(bgFetch);
    await cancelled;
    await run;
    expect(bgFetch.abort).toHaveBeenCalledOnce();
    expect($offlineDictionaryProgress.get().state).toBe("idle");
    // a late progress event from the aborted fetch must not touch the reset state
    bgFetch.downloaded = 1000;
    bgFetch.dispatchEvent(new Event("progress"));
    expect($offlineDictionaryProgress.get()).toMatchObject({ bytes: 0, state: "idle" });
  });

  it("closed gate + failing Background Fetch lookup → just waits", async () => {
    setConnection(Object.assign(new EventTarget(), { type: "cellular" }));
    const { manager } = makeManager({ get: vi.fn().mockRejectedValue(new Error("boom")) });
    installServiceWorker(manager);
    const { $offlineDictionaryProgress, patchOfflineDictionary, startDownload } = await load();
    patchOfflineDictionary({ enabled: true, wifiOnly: true });
    await startDownload();
    expect($offlineDictionaryProgress.get()).toMatchObject({
      state: "waiting",
      waitReason: "wifi",
    });
    expect(pageFetches()).toHaveLength(0);
  });

  it("an abort from the browser's download UI → paused, not auto-resumed", async () => {
    const { manager } = makeManager();
    const sw = installServiceWorker(manager);
    const { $offlineDictionaryProgress, patchOfflineDictionary, startDownload } = await load();
    patchOfflineDictionary({ enabled: true });
    await startDownload({ manual: true });
    sw.dispatchEvent(swMessage("abort"));
    expect($offlineDictionaryProgress.get().state).toBe("paused");

    window.dispatchEvent(new Event("online"));
    await new Promise((r) => setTimeout(r, 20));
    expect(manager.fetch).toHaveBeenCalledOnce();

    await startDownload({ manual: true }); // "resume" starts a fresh background fetch
    expect(manager.fetch).toHaveBeenCalledTimes(2);
  });

  it("a success with no tracked fetch (e.g. after a reload) marks done only once the cache confirms it", async () => {
    setConnection(Object.assign(new EventTarget(), { type: "cellular" }));
    const { manager } = makeManager();
    const sw = installServiceWorker(manager);
    const {
      $offlineDictionary,
      $offlineDictionaryProgress,
      patchOfflineDictionary,
      startDownload,
    } = await load();
    patchOfflineDictionary({ enabled: true, wifiOnly: true });
    await startDownload(); // waiting — nothing tracked, but the message listener is attached
    expect($offlineDictionaryProgress.get().state).toBe("waiting");

    sw.dispatchEvent(swMessage("success"));
    await new Promise((r) => setTimeout(r, 20));
    expect($offlineDictionary.get().syncedVersion).toBeNull(); // nothing cached yet

    const cache = await caches.open("pages");
    for (const slug of SLUGS) {
      await cache.put(
        `/wort/${slug}`,
        new Response("x", { headers: { "x-offline-dictionary-version": version } }),
      );
    }
    sw.dispatchEvent(swMessage("success", SLUGS.length));
    await vi.waitFor(() => expect($offlineDictionaryProgress.get().state).toBe("done"));
    expect($offlineDictionary.get().syncedVersion).toBe(version);
    expect(manager.fetch).not.toHaveBeenCalled();
  });
});
