import { describe, expect, it } from "vitest";

import { mcpAuditLine } from "../src/lib/mcpGuards";

describe("mcpAuditLine", () => {
  it("logs a finished tool call as metadata only", () => {
    const line = mcpAuditLine({
      type: "REQUEST_COMPLETED",
      method: "tools/call",
      status: "success",
      duration: 12,
      requestId: "r1",
      // the shape mcp-handler emits: the JSON-RPC request body as `result`
      result: {
        jsonrpc: "2.0",
        method: "tools/call",
        params: { name: "updateWords", arguments: { id: 7, berlinerisch: "geheim" } },
      },
    })!;
    expect(line).toContain('"tool":"updateWords"');
    expect(line).toContain('"id":7');
    expect(line).not.toContain("geheim");
  });

  it("skips everything but finished tool calls and errors", () => {
    expect(mcpAuditLine({ type: "REQUEST_RECEIVED", method: "tools/call" })).toBeNull();
    expect(mcpAuditLine({ type: "REQUEST_COMPLETED", method: "tools/list" })).toBeNull();
    expect(mcpAuditLine({ type: "SESSION_STARTED" })).toBeNull();
    expect(mcpAuditLine({ type: "ERROR", error: new Error("boom") })).toContain("boom");
  });
});
