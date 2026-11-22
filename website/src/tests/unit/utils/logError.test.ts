import { logRouteError } from "@utils/logError.ts";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => vi.restoreAllMocks());

describe("logRouteError", () => {
  it("logs the route, name and codes, never the message, stack or cause message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(
      new Error("Failed query: insert ... params: invented@example.test, secret text"),
      {
        cause: Object.assign(new Error("detail invented@example.test"), { code: "23505" }),
        code: "X1",
        name: "DrizzleQueryError",
      },
    );
    logRouteError("reports", error);
    const out = JSON.stringify(spy.mock.calls);
    expect(out).not.toContain("invented@example.test");
    expect(out).not.toContain("secret text");
    expect(out).toContain("reports");
    expect(out).toContain("DrizzleQueryError");
    expect(out).toContain("X1");
    expect(out).toContain("23505");
  });

  it("copes with a non-error value", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logRouteError("reports", "invented@example.test");
    expect(JSON.stringify(spy.mock.calls)).not.toContain("invented@example.test");
  });
});
