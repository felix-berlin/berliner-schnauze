import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({ INDEXNOW_KEY: undefined as string | undefined }));
vi.mock("astro:env/server", () => env);

import { GET } from "@/pages/indexnow.txt.ts";

const get = () => (GET as () => Response)();

describe("indexnow.txt", () => {
  beforeEach(() => {
    env.INDEXNOW_KEY = undefined;
  });

  it("serves the key as plain text", async () => {
    env.INDEXNOW_KEY = "abc123";
    const res = get();
    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(await res.text()).toBe("abc123");
  });

  it("is a 404 without a key", () => {
    expect(get().status).toBe(404);
  });
});
