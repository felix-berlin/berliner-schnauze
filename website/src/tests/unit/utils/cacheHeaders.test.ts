import { setPageCache } from "@utils/cacheHeaders.ts";
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
