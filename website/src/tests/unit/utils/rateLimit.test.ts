import {
  clientIp,
  networkKey,
  rateLimited,
  rateLimitRule,
  resetRateLimits,
} from "@utils/rateLimit.ts";
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

  it("limits GET /api/word-feedback to 60 per minute, PATCH not here", () => {
    const get = rateLimitRule("/api/word-feedback", "GET")!;
    expect(get.max).toBe(60);
    expect(rateLimitRule("/api/word-feedback", "PATCH")).toBeUndefined();
    const client = "t-feedback-get";
    for (let i = 0; i < 60; i++) expect(rateLimited(client, get, 0)).toBe(0);
    expect(rateLimited(client, get, 0)).toBeGreaterThan(0);
  });

  it("limits POST /api/word-pulse to 60 per minute", () => {
    const rule = rateLimitRule("/api/word-pulse", "POST")!;
    expect(rule.max).toBe(60);
    expect(rateLimitRule("/api/word-pulse", "GET")).toBeUndefined();
  });

  it("limits GET /api/trending to 60 per minute", () => {
    const rule = rateLimitRule("/api/trending", "GET")!;
    expect(rule.max).toBe(60);
    expect(rateLimitRule("/api/trending", "POST")).toBeUndefined();
  });

  it("vote limited at 31st per minute", () => {
    const vote = rateLimitRule("/api/comment-votes", "POST")!;
    const client = "t-vote";
    for (let i = 0; i < 30; i++) expect(rateLimited(client, vote, 0)).toBe(0);
    expect(rateLimited(client, vote, 0)).toBeGreaterThan(0);
  });

  it("limits the bon endpoints on POST, start stricter than next", () => {
    const start = rateLimitRule("/api/bon/start", "POST")!;
    const next = rateLimitRule("/api/bon/next", "POST")!;
    const finish = rateLimitRule("/api/bon/finish", "POST")!;
    expect(start.max).toBeLessThan(next.max);
    expect(finish).toBeDefined();
    expect(rateLimitRule("/api/bon/start", "GET")).toBeUndefined();
    const client = "t-bon-start";
    for (let i = 0; i < start.max; i++) expect(rateLimited(client, start, 0)).toBe(0);
    expect(rateLimited(client, start, 0)).toBeGreaterThan(0);
    expect(rateLimited(client, next, 0)).toBe(0);
  });

  it("limits the bon leaderboard to 60 per 10 min on GET", () => {
    expect(rateLimitRule("/api/bon/leaderboard", "GET")).toEqual({
      max: 60,
      method: "GET",
      prefix: "/api/bon/leaderboard",
      windowMs: 10 * 60_000,
    });
    expect(rateLimitRule("/api/bon/leaderboard", "POST")).toBeUndefined();
  });

  it("limits bon answer to 450 per 10 min on POST", () => {
    expect(rateLimitRule("/api/bon/answer", "POST")).toEqual({
      max: 450,
      method: "POST",
      prefix: "/api/bon/answer",
      windowMs: 10 * 60_000,
    });
  });

  it("limits the bon player code endpoints to 10 per 10 min on POST", () => {
    for (const path of ["/api/bon/player", "/api/bon/redeem"]) {
      const rule = rateLimitRule(path, "POST")!;
      expect(rule).toMatchObject({ max: 10, windowMs: 10 * 60_000 });
      for (let i = 0; i < rule.max; i++) expect(rateLimited(`t-${path}`, rule, 0)).toBe(0);
      expect(rateLimited(`t-${path}`, rule, 0)).toBeGreaterThan(0);
    }
  });

  it("gives /api/bon/player a GET rule (name lookup) but /api/bon/redeem none", () => {
    expect(rateLimitRule("/api/bon/player", "GET")).toBeDefined();
    expect(rateLimitRule("/api/bon/redeem", "GET")).toBeUndefined();
  });

  it("limits bon name reports to 10 per 10 min on POST", () => {
    expect(rateLimitRule("/api/bon/report-name", "POST")).toEqual({
      max: 10,
      method: "POST",
      prefix: "/api/bon/report-name",
      windowMs: 10 * 60_000,
    });
    expect(rateLimitRule("/api/bon/report-name", "GET")).toBeUndefined();
  });

  it("prunes at most once a minute and then drops the oldest clients above 100 000", () => {
    resetRateLimits();
    const rule = { max: 1, prefix: "/prune", windowMs: 60 * 60_000 };
    const t = 1_000_000;
    // 100 011 live clients; the scan at the 10 001st sets the minute
    for (let i = 0; i <= 100_010; i++) rateLimited(`c${i}`, rule, t);
    expect(rateLimited("c0", rule, t + 59_999)).toBeGreaterThan(0);
    rateLimited("new", rule, t + 60_000);
    expect(rateLimited("c0", rule, t + 60_001)).toBe(0);
    expect(rateLimited("c10", rule, t + 60_001)).toBe(0);
    expect(rateLimited("c11", rule, t + 60_001)).toBeGreaterThan(0);
    resetRateLimits();
  });

  it("takes the last forwarded-for entry, else the socket address", () => {
    expect(clientIp("1.1.1.1, 2.2.2.2 ", "9.9.9.9")).toBe("2.2.2.2");
    expect(clientIp(null, "9.9.9.9")).toBe("9.9.9.9");
    // IPv6 by its /64, so a client cannot dodge a limit by rotating its interface id.
    expect(clientIp("2001:db8::1", "9.9.9.9")).toBe("2001:0db8:0000:0000");
  });
});

describe("networkKey", () => {
  it("keeps IPv4, unwraps IPv4-mapped IPv6 and cuts IPv6 to its /64", () => {
    expect(networkKey("203.0.113.7")).toBe("203.0.113.7");
    expect(networkKey("::ffff:203.0.113.7")).toBe("203.0.113.7");
    expect(networkKey("2001:db8::1")).toBe("2001:0db8:0000:0000");
    expect(networkKey("2001:0DB8:0:0:ffff::2")).toBe("2001:0db8:0000:0000");
    expect(networkKey("2001:db8:1:2:3:4:5:6")).toBe("2001:0db8:0001:0002");
  });
});
