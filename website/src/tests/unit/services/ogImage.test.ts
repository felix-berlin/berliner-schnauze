import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

// A worker script that fails to load, like a missing dependency in the image.
const { brokenWorker } = vi.hoisted(() => ({ brokenWorker: `og-worker-broken-${process.pid}.mjs` }));
vi.mock("node:path", async (importOriginal) => {
  const path = await importOriginal<typeof import("node:path")>();
  const { tmpdir } = await import("node:os");
  return { ...path, resolve: () => path.join(tmpdir(), brokenWorker) };
});
writeFileSync(join(tmpdir(), brokenWorker), "throw new Error('boom');");

import { renderOgImage } from "@services/ogImage.ts";

describe("renderOgImage", () => {
  it("fails the render, not the process, when the worker dies", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(renderOgImage({ title: "Wat" })).rejects.toThrow("OG worker exited");
    expect(error).toHaveBeenCalledWith("[og] worker failed:", expect.any(Error));
  });
});
