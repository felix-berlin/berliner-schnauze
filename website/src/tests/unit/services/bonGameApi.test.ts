// @vitest-environment jsdom
import { answerCard, finishRun, nextCards, startRun } from "@services/bonGameApi";
import { afterEach, describe, expect, it, vi } from "vitest";

const respond = (body: unknown, status = 200) => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};
afterEach(() => vi.unstubAllGlobals());

describe("bonGameApi", () => {
  it("startRun posts without a body", async () => {
    const f = respond({ cards: [], token: "t" });
    expect(await startRun()).toEqual({ cards: [], token: "t" });
    expect(f).toHaveBeenCalledWith("/api/bon/start", { method: "POST" });
  });

  it("nextCards unwraps cards", async () => {
    const f = respond({ cards: [{ id: "1", word: "a" }] });
    expect(await nextCards("t")).toEqual([{ id: "1", word: "a" }]);
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ token: "t" });
  });

  it("answerCard throws the server error text", async () => {
    const f = respond({ error: "Die Karte jibt's jetzt nich." }, 409);
    await expect(answerCard("t", "3", true)).rejects.toThrow("Die Karte jibt's jetzt nich.");
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ card: "3", real: true, token: "t" });
  });

  it("finishRun returns the result", async () => {
    const r = { bestStreak: 1, correctAnswers: 1, score: 10, totalAnswered: 1 };
    respond(r);
    expect(await finishRun("t", "Ede")).toEqual(r);
  });

  it("finishRun returns undefined on 4xx and never throws", async () => {
    respond({ error: "x" }, 400);
    expect(await finishRun("t")).toBeUndefined();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("net")));
    expect(await finishRun("t")).toBeUndefined();
  });
});
