import { describe, expect, it } from "vitest";

import { mcpAuditLine, redactSuggestionResponse } from "../src/lib/mcpGuards";

const doc = {
  id: 1,
  berlinerWord: "Marke",
  userName: "Erika",
  userMail: "e@example.test",
  status: "new",
};
const respond = (text: string) => ({ content: [{ type: "text", text }] });

describe("redactSuggestionResponse", () => {
  it("strips sender fields from find and findByID output, keeps the rest", () => {
    const find = `Collection: "suggestions"\nTotal: 1 documents\n\n\`\`\`json\n${JSON.stringify(doc)}\n\`\`\``;
    const byId = `Resource from collection "suggestions":\n${JSON.stringify(doc)}`;
    for (const text of [find, byId]) {
      const out = redactSuggestionResponse(respond(text)).content[0]!.text;
      expect(out).not.toContain("userName");
      expect(out).not.toContain("userMail");
      expect(out).toContain('"berlinerWord":"Marke"');
    }
  });

  it("leaves text and broken JSON lines alone", () => {
    const text = 'Error: Document not found\n{"userName": broken';
    expect(redactSuggestionResponse(respond(text)).content[0]!.text).toBe(text);
  });
});

describe("mcpAuditLine", () => {
  it("logs a finished tool call as metadata only", () => {
    const line = mcpAuditLine({
      type: "REQUEST_COMPLETED",
      method: "tools/call",
      status: "success",
      duration: 12,
      requestId: "r1",
      parameters: { name: "updateWords", arguments: { id: 7, berlinerisch: "geheim" } },
      result: { content: [{ text: "full document" }] },
    })!;
    expect(line).toContain('"tool":"updateWords"');
    expect(line).toContain('"id":7');
    expect(line).not.toContain("geheim");
    expect(line).not.toContain("full document");
  });

  it("skips everything but finished tool calls and errors", () => {
    expect(mcpAuditLine({ type: "REQUEST_RECEIVED", method: "tools/call" })).toBeNull();
    expect(mcpAuditLine({ type: "REQUEST_COMPLETED", method: "tools/list" })).toBeNull();
    expect(mcpAuditLine({ type: "SESSION_STARTED" })).toBeNull();
    expect(mcpAuditLine({ type: "ERROR", error: new Error("boom") })).toContain("boom");
  });
});
