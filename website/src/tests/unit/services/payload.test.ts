import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPayload } = vi.hoisted(() => ({ getPayload: vi.fn() }));
vi.mock("payload-app", () => ({ config: Promise.resolve({}), getPayload }));
vi.mock("astro:env/server", () => ({ PAYLOAD_SERVER_URL: "https://cms.example" }));

import { getPayloadClient, mediaFileUrl, mediaUrl } from "@services/payload.ts";

beforeEach(() => getPayload.mockReset());

describe("getPayloadClient", () => {
  it("shares one client between calls", async () => {
    getPayload.mockResolvedValue({ id: "payload" });
    const [a, b] = await Promise.all([getPayloadClient(), getPayloadClient()]);
    expect(a).toBe(b);
    expect(getPayload).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failed connection", async () => {
    // A fresh module state, since the previous test already cached a client.
    vi.resetModules();
    const { getPayloadClient: fresh } = await import("@services/payload.ts");
    getPayload.mockRejectedValueOnce(new Error("db down")).mockResolvedValueOnce({ id: "payload" });
    await expect(fresh()).rejects.toThrow("db down");
    await expect(fresh()).resolves.toEqual({ id: "payload" });
  });
});

describe("mediaUrl", () => {
  it("makes a media url absolute", () => {
    expect(mediaUrl({ url: "/api/media/file/a.mp3" } as never)).toBe(
      "https://cms.example/api/media/file/a.mp3",
    );
  });

  it.each([[7], [null], [undefined], [{ url: null }]])("returns undefined for %j", (media) => {
    expect(mediaUrl(media as never)).toBeUndefined();
  });
});

describe("mediaFileUrl", () => {
  it("builds the absolute file url on the CMS host, encoding the filename", () => {
    expect(mediaFileUrl("brown bear.png")).toBe(
      "https://cms.example/api/media/file/brown%20bear.png",
    );
  });
});
