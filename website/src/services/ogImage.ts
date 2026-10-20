import type { generateOpenGraphImage } from "astro-og-canvas";

import { resolve } from "node:path";
import { Worker } from "node:worker_threads";

type OgOptions = Parameters<typeof generateOpenGraphImage>[0];
type Pending = { reject: (error: Error) => void; resolve: (image: Uint8Array<ArrayBuffer>) => void };

/** The worker exits after this long without a render, and canvaskit's memory goes with it. */
const IDLE_MS = 30_000;

let worker: Worker | undefined;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let nextId = 0;
const pending = new Map<number, Pending>();

const failAll = (error: Error) => {
  for (const { reject } of pending.values()) reject(error);
  pending.clear();
};

const startWorker = (): Worker => {
  // Relative to the working directory, like the OG font: website/ in dev, /app in the image.
  const started = new Worker(resolve("server/og-worker.mjs"));
  started.unref();
  started.on(
    "message",
    ({ error, id, image }: { error?: string; id: number; image?: Uint8Array<ArrayBuffer> }) => {
      const job = pending.get(id);
      pending.delete(id);
      if (error || !image) job?.reject(new Error(error ?? "OG worker returned no image"));
      else job?.resolve(image);
      if (pending.size === 0)
        idleTimer = setTimeout(() => {
          // Detach first: a render arriving while it shuts down starts a fresh worker.
          if (worker === started) worker = undefined;
          void started.terminate();
        }, IDLE_MS);
    },
  );
  // Without a listener a worker error (a module that fails to load, ...) would crash the whole server.
  started.on("error", (error) => console.error("[og] worker failed:", error));
  // A crash fails the renders in flight. An idle worker is detached before it exits and has none, while
  // `pending` may already hold jobs of its successor.
  started.on("exit", () => {
    if (worker !== started) return;
    worker = undefined;
    failAll(new Error("OG worker exited"));
  });
  return started;
};

/** generateOpenGraphImage in a worker thread that exits when idle (canvaskit would keep ~150 MB in this process). */
export const renderOgImage = (options: OgOptions): Promise<Uint8Array<ArrayBuffer>> => {
  clearTimeout(idleTimer);
  worker ??= startWorker();
  const id = nextId++;
  const target = worker;
  return new Promise((resolve, reject) => {
    pending.set(id, { reject, resolve });
    target.postMessage({ id, options });
  });
};
