import { clientIp, rateLimited, rateLimitRule } from "@utils/rateLimit.ts";
import { describe, expect, it } from "vitest";

describe("rateLimit", () => {
  it("limits only the expensive routes, suggest-word only on POST", () => {
    expect(rateLimitRule("/og/wat.png", "GET")?.max).toBe(60);
    expect(rateLimitRule("/api/suggest-word", "POST")?.max).toBe(5);
    expect(rateLimitRule("/api/suggest-word", "GET")).toBeUndefined();
    expect(rateLimitRule("/wort/wat", "GET")).toBeUndefined();
  });

  it("counts per client within the window and starts over after it", () => {
    const rule = { max: 2, prefix: "/test-a", windowMs: 1000 };
    expect(rateLimited("a", rule, 0)).toBe(0);
    expect(rateLimited("a", rule, 100)).toBe(0);
    expect(rateLimited("a", rule, 200)).toBe(1);
    expect(rateLimited("b", rule, 200)).toBe(0);
    expect(rateLimited("a", rule, 1000)).toBe(0);
  });

  it("GET and POST /api/comments count separately", () => {
    const get = rateLimitRule("/api/comments", "GET")!;
    const post = rateLimitRule("/api/comments", "POST")!;
    const client = "t-get-post";
    for (let i = 0; i < 6; i++) expect(rateLimited(client, get, 0)).toBe(0);
    expect(rateLimited(client, post, 0)).toBe(0);
  });

  it("PATCH and DELETE share 10 per 5 min", () => {
    const patch = rateLimitRule("/api/comments/abc", "PATCH")!;
    const del = rateLimitRule("/api/comments/abc", "DELETE")!;
    const client = "t-own";
    for (let i = 0; i < 5; i++) expect(rateLimited(client, patch, 0)).toBe(0);
    for (let i = 0; i < 5; i++) expect(rateLimited(client, del, 0)).toBe(0);
    expect(rateLimited(client, patch, 0)).toBeGreaterThan(0);
  });

  it("vote limited at 31st per minute", () => {
    const vote = rateLimitRule("/api/comment-votes", "POST")!;
    const client = "t-vote";
    for (let i = 0; i < 30; i++) expect(rateLimited(client, vote, 0)).toBe(0);
    expect(rateLimited(client, vote, 0)).toBeGreaterThan(0);
  });

  it("takes the last forwarded-for entry, else the socket address", () => {
    expect(clientIp("1.1.1.1, 2.2.2.2 ", "9.9.9.9")).toBe("2.2.2.2");
    expect(clientIp(null, "9.9.9.9")).toBe("9.9.9.9");
  });
});
