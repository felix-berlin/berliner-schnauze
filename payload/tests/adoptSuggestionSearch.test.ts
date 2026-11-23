import { describe, expect, it, vi } from "vitest";

import { adoptSuggestion } from "../src/hooks/adoptSuggestion";

describe("adoptSuggestion", () => {
  it("tells the editor mail when the similar-words search fails, and keeps the suggestion", async () => {
    const error = vi.fn<(msg: unknown) => void>();
    const req = {
      context: {} as Record<string, unknown>,
      payload: {
        find: vi.fn<() => Promise<never>>().mockRejectedValue(new Error("db down")),
        logger: { error },
      },
    };
    const data = { berlinerWord: "Kiez", type: "word" };
    const out = await adoptSuggestion({
      data,
      operation: "create",
      originalDoc: undefined,
      req,
    } as never);
    expect(out).toBe(data);
    expect(req.context.similarWords).toEqual(["(Suche fehlgeschlagen)"]);
    expect(error).toHaveBeenCalled();
  });
});
