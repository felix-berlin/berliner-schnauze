import { createLocalReq } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getTestPayload } from "./helpers/payload";

const EMAIL = "mcp@test.local";
const KEY = "mcp-test-key";

/** POSTs a JSON-RPC call to the plugin's `/api/mcp` handler, as the REST layer would. */
async function post(method: string, authorization?: string, params: object = {}) {
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
  return (await endpoint.handler(req)) as Response;
}

async function rpc(method: string, authorization?: string, params: object = {}) {
  const text = await (await post(method, authorization, params)).text();
  // The transport answers plain JSON or one SSE `data:` line.
  return JSON.parse(text.match(/^data: (.*)$/m)?.[1] ?? text);
}

beforeAll(async () => {
  const payload = await getTestPayload();
  const user = await payload.create({
    collection: "users",
    data: { email: EMAIL, password: "x".repeat(16) },
  });
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
  await payload.delete({
    collection: "payload-mcp-api-keys",
    where: { label: { equals: "test" } },
  });
  await payload.delete({ collection: "users", where: { email: { equals: EMAIL } } });
});

const WORD = "mcp-test-wort";
/** The plugin reports a failed tool call as plain text, without `isError`. */
const text = (body: { result: { content: { text: string }[] } }) => body.result.content[0]!.text;

describe("mcp endpoint", () => {
  it("rejects a request without an API key", async () => {
    await expect(post("tools/list")).rejects.toMatchObject({ status: 401 }); // the REST layer turns it into a 401
  });

  it("rejects an unknown API key", async () => {
    await expect(post("tools/list", "Bearer nope")).rejects.toMatchObject({ status: 401 });
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
      const body = await rpc("tools/call", `Bearer ${KEY}`, {
        name: "createWords",
        arguments: { berlinerisch: WORD },
      });
      expect(body.result.isError).toBeFalsy();
      const { docs } = await payload.find({
        collection: "words",
        where: { berlinerisch: { equals: WORD } },
        draft: true,
        limit: 1,
      });
      expect(docs[0]?._status).toBe("draft");
    } finally {
      await payload.delete({ collection: "words", where: { berlinerisch: { equals: WORD } } });
    }
  });

  it("never shows the sender of a suggestion, with or without select", async () => {
    const payload = await getTestPayload();
    const made = await payload.create({
      collection: "suggestions",
      data: {
        berlinerWord: WORD,
        translation: "t",
        userName: "Erika Geheim",
        userMail: "erika@example.test",
      },
    });
    try {
      for (const select of [undefined, { userName: true, userMail: true, berlinerWord: true }]) {
        const body = await rpc("tools/call", `Bearer ${KEY}`, {
          name: "findSuggestions",
          arguments: {
            where: JSON.stringify({ berlinerWord: { equals: WORD } }),
            ...(select && { select }),
          },
        });
        expect(text(body)).toContain(WORD);
        expect(text(body)).not.toMatch(/Erika|erika@/);
      }
      // update by id and in bulk (where): the bulk result is one JSON array, which line-based redaction missed
      for (const target of [
        { id: made.id },
        { where: JSON.stringify({ berlinerWord: { equals: WORD } }) },
      ]) {
        const body = await rpc("tools/call", `Bearer ${KEY}`, {
          name: "updateSuggestions",
          arguments: { ...target, status: "rejected", userMail: "leak@example.test" },
        });
        expect(text(body)).toContain(WORD);
        expect(text(body)).not.toMatch(/Erika|erika@/);
      }
      // the fields cannot be queried either (no guessing oracle) and stay intact in the database
      const probe = await rpc("tools/call", `Bearer ${KEY}`, {
        name: "findSuggestions",
        arguments: { where: JSON.stringify({ userMail: { like: "erika" } }) },
      });
      expect(text(probe)).not.toContain(WORD);
      const stored = await payload.findByID({ collection: "suggestions", id: made.id });
      expect(stored.userMail).toBe("erika@example.test"); // the MCP write to userMail was dropped
      expect(stored.status).toBe("rejected");
    } finally {
      await payload.delete({ collection: "suggestions", id: made.id });
    }
  });

  it("never publishes, and edits a published word only as a draft", async () => {
    const payload = await getTestPayload();
    const live = await payload.create({
      collection: "words",
      data: { berlinerisch: WORD, _status: "published" },
      draft: false,
    });
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

      for (const target of [
        { id: live.id },
        { where: JSON.stringify({ id: { equals: live.id } }) },
      ]) {
        const unpublish = await rpc("tools/call", `Bearer ${KEY}`, {
          name: "updateWords",
          arguments: { ...target, berlinerisch: `${WORD}-weg`, draft: false, _status: "draft" },
        });
        expect(text(unpublish)).toContain("nur als Entwurf");
        expect(await publishedText()).toBe(WORD);
      }

      const draftEdit = await rpc("tools/call", `Bearer ${KEY}`, {
        name: "updateWords",
        arguments: { id: live.id, berlinerisch: `${WORD}-entwurf`, draft: true },
      });
      expect(text(draftEdit)).toContain("updated successfully");
      expect(await publishedText()).toBe(WORD);
      expect(
        (await payload.findByID({ collection: "words", id: live.id, draft: true })).berlinerisch,
      ).toBe(`${WORD}-entwurf`);
    } finally {
      await payload.delete({ collection: "words", where: { berlinerisch: { like: WORD } } });
    }
  });

  const rich = (t: string) => ({
    root: {
      type: "root",
      children: [
        { type: "paragraph", children: [{ type: "text", text: t, version: 1 }], version: 1 },
      ],
      direction: null,
      format: "",
      indent: 0,
      version: 1,
    },
  });
  const madeWithCredits = async () =>
    (await getTestPayload()).create({
      collection: "words",
      draft: true,
      data: {
        berlinerisch: WORD,
        facts: [{ kind: "herkunft", text: rich("alt"), contributorName: "Anna Geheim" }],
        related: [{ label: "Brot", relation: "gleich", contributorName: "Bert Geheim" }],
        examples: [{ example: "Ein Satz.", contributorName: "Cora Geheim" }],
      } as never,
    });
  const credits = async (id: number) =>
    (await (await getTestPayload()).findByID({ collection: "words", id, draft: true })) as {
      facts?: { text?: unknown; contributorName?: string | null }[];
      related?: { contributorName?: string | null }[];
      examples?: { contributorName?: string | null }[];
    };
  const cleanWord = async () =>
    (await getTestPayload()).delete({
      collection: "words",
      where: { berlinerisch: { like: WORD } },
    });

  it("never shows contributorName of facts and related rows, with or without select", async () => {
    const made = await madeWithCredits();
    try {
      for (const select of [undefined, { facts: true, related: true, examples: true }]) {
        const body = await rpc("tools/call", `Bearer ${KEY}`, {
          name: "findWords",
          arguments: {
            where: JSON.stringify({ id: { equals: made.id } }),
            draft: true,
            ...(select && { select }),
          },
        });
        expect(text(body)).toContain("alt");
        expect(text(body)).not.toMatch(/Geheim/);
      }
    } finally {
      await cleanWord();
    }
  });

  it("keeps an existing contributorName when an MCP update rewrites the facts", async () => {
    const made = await madeWithCredits();
    try {
      const body = await rpc("tools/call", `Bearer ${KEY}`, {
        name: "updateWords",
        arguments: {
          id: made.id,
          draft: true,
          facts: [{ kind: "geschichte", text: rich("neu"), contributorName: "Hacker" }],
        },
      });
      expect(text(body)).toContain("updated successfully");
      const after = await credits(made.id);
      expect(JSON.stringify(after.facts?.[0]?.text)).toContain("neu");
      expect(after.facts?.[0]?.contributorName).toBe("Anna Geheim");
    } finally {
      await cleanWord();
    }
  });

  it("keeps an existing contributorName of related rows when an MCP update rewrites them", async () => {
    const made = await madeWithCredits();
    try {
      const body = await rpc("tools/call", `Bearer ${KEY}`, {
        name: "updateWords",
        arguments: {
          id: made.id,
          draft: true,
          related: [{ label: "Schrippe", relation: "gleich", contributorName: "Hacker" }],
        },
      });
      expect(text(body)).toContain("updated successfully");
      const after = await credits(made.id);
      expect(after.related?.[0]?.contributorName).toBe("Bert Geheim");
    } finally {
      await cleanWord();
    }
  });

  it("keeps an existing contributorName of examples when an MCP update rewrites them", async () => {
    const made = await madeWithCredits();
    try {
      const body = await rpc("tools/call", `Bearer ${KEY}`, {
        name: "updateWords",
        arguments: {
          id: made.id,
          draft: true,
          examples: [{ example: "Neuer Satz.", contributorName: "Hacker" }],
        },
      });
      expect(text(body)).toContain("updated successfully");
      const after = await credits(made.id);
      expect(after.examples?.[0]?.contributorName).toBe("Cora Geheim");
    } finally {
      await cleanWord();
    }
  });

  it("cannot move a published word to the trash", async () => {
    const payload = await getTestPayload();
    const live = await payload.create({
      collection: "words",
      data: { berlinerisch: WORD, _status: "published" },
      draft: false,
    });
    const stillLive = async () =>
      (await payload.find({ collection: "words", where: { id: { equals: live.id } } })).totalDocs;
    try {
      for (const draft of [false, true])
        await rpc("tools/call", `Bearer ${KEY}`, {
          name: "updateWords",
          arguments: { id: live.id, deletedAt: new Date().toISOString(), draft },
        });
      expect(await stillLive()).toBe(1);
    } finally {
      await payload.delete({
        collection: "words",
        trash: true,
        where: { berlinerisch: { like: WORD } },
      });
    }
  });
});
