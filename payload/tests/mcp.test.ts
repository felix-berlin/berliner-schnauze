import { createLocalReq } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getTestPayload } from "./helpers/payload";

const EMAIL = "mcp@test.local";
const KEY = "mcp-test-key";

/** POSTs a JSON-RPC call to the plugin's `/api/mcp` handler, as the REST layer would. */
async function rpc(method: string, authorization?: string, params: object = {}) {
  const payload = await getTestPayload();
  const endpoint = payload.config.endpoints.find((e) => e.path === "/mcp" && e.method === "post")!;
  const req = await createLocalReq({}, payload);
  Object.assign(req, { url: "http://localhost/api/mcp", method: "POST" });
  req.headers = new Headers({
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    ...(authorization ? { Authorization: authorization } : {}),
  });
  Object.assign(req, { body: JSON.stringify({ jsonrpc: "2.0", id: "1", method, params }) });
  const res = (await endpoint.handler(req)) as Response;
  const text = await res.text();
  // The transport answers plain JSON or one SSE `data:` line.
  return JSON.parse(text.match(/^data: (.*)$/m)?.[1] ?? text);
}

beforeAll(async () => {
  const payload = await getTestPayload();
  const user = await payload.create({ collection: "users", data: { email: EMAIL, password: "x".repeat(16) } });
  await payload.create({
    collection: "payload-mcp-api-keys",
    data: {
      user: user.id,
      label: "test",
      enableAPIKey: true,
      apiKey: KEY,
      words: { find: true, create: true, update: true },
      suggestions: { find: true, update: true },
    },
  });
});

afterAll(async () => {
  const payload = await getTestPayload();
  await payload.delete({ collection: "payload-mcp-api-keys", where: { label: { equals: "test" } } });
  await payload.delete({ collection: "users", where: { email: { equals: EMAIL } } });
});

const WORD = "mcp-test-wort";
/** The plugin reports a failed tool call as plain text, without `isError`. */
const text = (body: { result: { content: { text: string }[] } }) => body.result.content[0]!.text;

describe("mcp endpoint", () => {
  it("rejects a request without an API key", async () => {
    await expect(rpc("tools/list")).rejects.toThrow();
  });

  it("rejects an unknown API key", async () => {
    await expect(rpc("tools/list", "Bearer nope")).rejects.toThrow();
  });

  it("offers find/create/update for words, find/update for suggestions, and nothing else", async () => {
    const body = await rpc("tools/list", `Bearer ${KEY}`);
    const names: string[] = body.result.tools.map((t: { name: string }) => t.name).sort();
    expect(names).toEqual([
      "createWords",
      "findSuggestions",
      "findWords",
      "updateSuggestions",
      "updateWords",
    ]);
  });

  it("creates a word as a draft", async () => {
    const payload = await getTestPayload();
    try {
      const body = await rpc("tools/call", `Bearer ${KEY}`, { name: "createWords", arguments: { berlinerisch: WORD } });
      expect(body.result.isError).toBeFalsy();
      const { docs } = await payload.find({ collection: "words", where: { berlinerisch: { equals: WORD } }, draft: true, limit: 1 });
      expect(docs[0]?._status).toBe("draft");
    } finally {
      await payload.delete({ collection: "words", where: { berlinerisch: { equals: WORD } } });
    }
  });

  it("never publishes, and edits a published word only as a draft", async () => {
    const payload = await getTestPayload();
    const live = await payload.create({ collection: "words", data: { berlinerisch: WORD, _status: "published" }, draft: false });
    const publishedText = async () =>
      (await payload.findByID({ collection: "words", id: live.id, draft: false })).berlinerisch;
    try {
      const create = await rpc("tools/call", `Bearer ${KEY}`, {
        name: "createWords",
        arguments: { berlinerisch: `${WORD}-neu`, _status: "published" },
      });
      expect(text(create)).toContain("nur als Entwurf");

      const liveEdit = await rpc("tools/call", `Bearer ${KEY}`, {
        name: "updateWords",
        arguments: { id: live.id, berlinerisch: `${WORD}-live` },
      });
      expect(text(liveEdit)).toContain("nur als Entwurf");
      expect(await publishedText()).toBe(WORD);

      const draftEdit = await rpc("tools/call", `Bearer ${KEY}`, {
        name: "updateWords",
        arguments: { id: live.id, berlinerisch: `${WORD}-entwurf`, draft: true },
      });
      expect(text(draftEdit)).toContain("updated successfully");
      expect(await publishedText()).toBe(WORD);
      expect((await payload.findByID({ collection: "words", id: live.id, draft: true })).berlinerisch).toBe(`${WORD}-entwurf`);
    } finally {
      await payload.delete({ collection: "words", where: { berlinerisch: { like: WORD } } });
    }
  });
});
