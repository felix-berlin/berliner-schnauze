import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---- mocks ----------------------------------------------------------------

vi.mock("@stores/toastNotify.ts", () => ({ createToastNotify: vi.fn() }));
vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

// ---- helpers --------------------------------------------------------------

function makeRegistration(sub: PushSubscription | null = null) {
  return {
    pushManager: {
      getSubscription: vi.fn().mockResolvedValue(sub),
      subscribe: vi.fn().mockResolvedValue(makeSub()),
    },
  };
}

function makeSub(ok = true): PushSubscription {
  return {
    unsubscribe: vi.fn().mockResolvedValue(ok),
    endpoint: "https://push.example.com/sub",
  } as unknown as PushSubscription;
}

// ---- setup ----------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();

  // provide navigator.serviceWorker
  Object.defineProperty(global.navigator, "serviceWorker", {
    value: { ready: Promise.resolve(makeRegistration()) },
    writable: true,
    configurable: true,
  });

  // provide window.PushManager so isPushSupported() returns true
  Object.defineProperty(global.window, "PushManager", { value: {}, writable: true, configurable: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---- urlBase64ToUint8Array ------------------------------------------------

describe("urlBase64ToUint8Array", () => {
  it("decodes a valid URL-safe base64 VAPID key", async () => {
    const { urlBase64ToUint8Array } = await import("@stores/pushSubscription.ts");
    // known VAPID public key (88 chars URL-safe base64)
    const key = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
    const result = urlBase64ToUint8Array(key);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(65);
  });

  it("throws on a malformed base64 string", async () => {
    const { urlBase64ToUint8Array } = await import("@stores/pushSubscription.ts");
    expect(() => urlBase64ToUint8Array("!!!invalid!!!")).toThrow();
  });
});

// ---- loadPushState --------------------------------------------------------

describe("loadPushState", () => {
  it("sets subscribed + stores subscription when SW has one", async () => {
    const sub = makeSub();
    const reg = makeRegistration(sub);
    Object.defineProperty(global.navigator, "serviceWorker", {
      value: { ready: Promise.resolve(reg) },
      writable: true,
      configurable: true,
    });
    const { loadPushState, $pushState, $pushSubscription } = await import("@stores/pushSubscription.ts");
    await loadPushState();
    expect($pushState.get()).toBe("subscribed");
    expect($pushSubscription.get()).toBe(sub);
  });

  it("sets unsubscribed when SW returns null subscription", async () => {
    const reg = makeRegistration(null);
    Object.defineProperty(global.navigator, "serviceWorker", {
      value: { ready: Promise.resolve(reg) },
      writable: true,
      configurable: true,
    });
    const { loadPushState, $pushState, $pushSubscription } = await import("@stores/pushSubscription.ts");
    await loadPushState();
    expect($pushState.get()).toBe("unsubscribed");
    expect($pushSubscription.get()).toBeNull();
  });

  it("sets error + shows toast when SW.ready rejects", async () => {
    Object.defineProperty(global.navigator, "serviceWorker", {
      value: { ready: Promise.reject(new Error("SW unavailable")) },
      writable: true,
      configurable: true,
    });
    const { loadPushState, $pushState } = await import("@stores/pushSubscription.ts");
    const { createToastNotify } = await import("@stores/toastNotify.ts");
    await loadPushState();
    expect($pushState.get()).toBe("error");
    expect(createToastNotify).toHaveBeenCalledOnce();
  });

  it("can be retried after an error", async () => {
    Object.defineProperty(global.navigator, "serviceWorker", {
      value: { ready: Promise.reject(new Error("SW unavailable")) },
      writable: true,
      configurable: true,
    });
    const { loadPushState, $pushState } = await import("@stores/pushSubscription.ts");
    await loadPushState();
    expect($pushState.get()).toBe("error");

    const sub = makeSub();
    const reg = makeRegistration(sub);
    Object.defineProperty(global.navigator, "serviceWorker", {
      value: { ready: Promise.resolve(reg) },
      writable: true,
      configurable: true,
    });
    await loadPushState();
    expect($pushState.get()).toBe("subscribed");
  });

  it("is idempotent — concurrent calls do not double-load", async () => {
    const reg = makeRegistration(null);
    let resolveReady!: (v: unknown) => void;
    const readyPromise = new Promise((r) => { resolveReady = r; });
    Object.defineProperty(global.navigator, "serviceWorker", {
      value: { ready: readyPromise },
      writable: true,
      configurable: true,
    });
    const { loadPushState } = await import("@stores/pushSubscription.ts");
    const p1 = loadPushState();
    const p2 = loadPushState(); // second call while first is in flight
    resolveReady(reg);
    await Promise.all([p1, p2]);
    expect(reg.pushManager.getSubscription).toHaveBeenCalledOnce();
  });
});

// ---- subscribePush --------------------------------------------------------

describe("subscribePush", () => {
  it("does nothing when state is already subscribed", async () => {
    const reg = makeRegistration(null);
    Object.defineProperty(global.navigator, "serviceWorker", {
      value: { ready: Promise.resolve(reg) },
      writable: true,
      configurable: true,
    });
    vi.stubEnv("PUBLIC_VAPID_PUBLIC_KEY", "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U");
    const { subscribePush, $pushState } = await import("@stores/pushSubscription.ts");
    $pushState.set("subscribed");
    await subscribePush();
    expect(reg.pushManager.subscribe).not.toHaveBeenCalled();
  });

  it("sets error immediately when VAPID key is missing", async () => {
    vi.stubEnv("PUBLIC_VAPID_PUBLIC_KEY", "");
    const { subscribePush, $pushState } = await import("@stores/pushSubscription.ts");
    $pushState.set("unsubscribed");
    await subscribePush();
    expect($pushState.get()).toBe("error");
  });

  it("subscribes and sets subscribed on success", async () => {
    const sub = makeSub();
    const reg = { pushManager: { getSubscription: vi.fn(), subscribe: vi.fn().mockResolvedValue(sub) } };
    Object.defineProperty(global.navigator, "serviceWorker", {
      value: { ready: Promise.resolve(reg) },
      writable: true,
      configurable: true,
    });
    vi.stubEnv("PUBLIC_VAPID_PUBLIC_KEY", "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U");
    const { subscribePush, $pushState, $pushSubscription } = await import("@stores/pushSubscription.ts");
    $pushState.set("unsubscribed");
    await subscribePush();
    expect($pushState.get()).toBe("subscribed");
    expect($pushSubscription.get()).toBe(sub);
  });

  it("sets error + shows toast on subscribe failure", async () => {
    const reg = { pushManager: { getSubscription: vi.fn(), subscribe: vi.fn().mockRejectedValue(new Error("fail")) } };
    Object.defineProperty(global.navigator, "serviceWorker", {
      value: { ready: Promise.resolve(reg) },
      writable: true,
      configurable: true,
    });
    vi.stubEnv("PUBLIC_VAPID_PUBLIC_KEY", "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U");
    const { subscribePush, $pushState } = await import("@stores/pushSubscription.ts");
    const { createToastNotify } = await import("@stores/toastNotify.ts");
    $pushState.set("unsubscribed");
    await subscribePush();
    expect($pushState.get()).toBe("error");
    expect(createToastNotify).toHaveBeenCalledOnce();
  });

  it("shows permission-denied toast on NotAllowedError", async () => {
    const denied = Object.assign(new DOMException("User denied", "NotAllowedError"));
    const reg = { pushManager: { getSubscription: vi.fn(), subscribe: vi.fn().mockRejectedValue(denied) } };
    Object.defineProperty(global.navigator, "serviceWorker", {
      value: { ready: Promise.resolve(reg) },
      writable: true,
      configurable: true,
    });
    vi.stubEnv("PUBLIC_VAPID_PUBLIC_KEY", "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U");
    const { subscribePush, $pushState } = await import("@stores/pushSubscription.ts");
    const { createToastNotify } = await import("@stores/toastNotify.ts");
    $pushState.set("unsubscribed");
    await subscribePush();
    expect($pushState.get()).toBe("error");
    const call = (createToastNotify as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.message).toContain("Browser-Einstellungen");
  });
});

// ---- unsubscribePush ------------------------------------------------------

describe("unsubscribePush", () => {
  it("unsubscribes, clears subscription, sets unsubscribed", async () => {
    const sub = makeSub();
    const { unsubscribePush, $pushState, $pushSubscription } = await import("@stores/pushSubscription.ts");
    $pushSubscription.set(sub);
    $pushState.set("subscribed");
    await unsubscribePush();
    expect(sub.unsubscribe).toHaveBeenCalledOnce();
    expect($pushSubscription.get()).toBeNull();
    expect($pushState.get()).toBe("unsubscribed");
  });

  it("is a no-op when subscription is null", async () => {
    const { unsubscribePush, $pushState, $pushSubscription } = await import("@stores/pushSubscription.ts");
    $pushSubscription.set(null);
    $pushState.set("unsubscribed");
    await unsubscribePush();
    expect($pushState.get()).toBe("unsubscribed");
  });

  it("sets error + shows toast when unsubscribe() rejects", async () => {
    const sub = makeSub();
    (sub.unsubscribe as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network error"));
    const { unsubscribePush, $pushState, $pushSubscription } = await import("@stores/pushSubscription.ts");
    const { createToastNotify } = await import("@stores/toastNotify.ts");
    $pushSubscription.set(sub);
    $pushState.set("subscribed");
    await unsubscribePush();
    expect($pushState.get()).toBe("error");
    expect(createToastNotify).toHaveBeenCalledOnce();
  });

  it("does nothing when state is loading", async () => {
    const sub = makeSub();
    const { unsubscribePush, $pushState, $pushSubscription } = await import("@stores/pushSubscription.ts");
    $pushSubscription.set(sub);
    $pushState.set("loading");
    await unsubscribePush();
    expect(sub.unsubscribe).not.toHaveBeenCalled();
    expect($pushState.get()).toBe("loading");
  });
});
