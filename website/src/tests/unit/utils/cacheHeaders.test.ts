import { jsonWithEtag, setPageCache } from "@utils/cacheHeaders.ts";
import { describe, expect, it } from "vitest";

const response = (status = 200) => ({ headers: new Headers(), status });

describe("setPageCache", () => {
  it("lets the proxy cache successful pages and the browser always revalidate", () => {
    const res = response();
    setPageCache(res);
    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
    );
  });

  it("honours a custom shared-cache time", () => {
    const res = response();
    setPageCache(res, { sMaxAge: 3600 });
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
  });

  it.each([404, 500, 503])("never caches a %i", (status) => {
    const res = response(status);
    setPageCache(res);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("keeps a Cache-Control a page set itself", () => {
    const res = response();
    res.headers.set("Cache-Control", "private");
    setPageCache(res);
    expect(res.headers.get("Cache-Control")).toBe("private");
  });
});

describe("jsonWithEtag", () => {
  it("sends the body with a weak ETag, and an empty 304 when the client has that version", async () => {
    const full = jsonWithEtag(new Request("https://x/"), '{"a":1}');
    const etag = full.headers.get("ETag")!;
    expect(etag).toMatch(/^W\/"/);
    expect(await full.text()).toBe('{"a":1}');

    const same = jsonWithEtag(
      new Request("https://x/", { headers: { "If-None-Match": etag } }),
      '{"a":1}',
    );
    expect(same.status).toBe(304);
    expect(await same.text()).toBe("");

    const changed = jsonWithEtag(
      new Request("https://x/", { headers: { "If-None-Match": etag } }),
      '{"a":2}',
    );
    expect(changed.status).toBe(200);
  });
});
