type Rule = { max: number; method?: string; prefix: string; windowMs: number; key?: string };

/**
 * Routes that cost real work per request (canvaskit, Turnstile + mail, token checks), per client.
 * First match wins: the `/api/comments/` rules (single comment) must come before the `/api/comments` ones.
 */
const RULES: Rule[] = [
  { max: 5, method: "POST", prefix: "/api/suggest-word", windowMs: 10 * 60_000 },
  { max: 60, prefix: "/og/", windowMs: 60_000 },
  { max: 20, prefix: "/api/preview", windowMs: 60_000 },
  { max: 5, method: "POST", prefix: "/api/comments", windowMs: 10 * 60_000 },
  { max: 120, method: "GET", prefix: "/api/comments", windowMs: 60_000 },
  { key: "comment-own", max: 10, method: "PATCH", prefix: "/api/comments/", windowMs: 5 * 60_000 },
  { key: "comment-own", max: 10, method: "DELETE", prefix: "/api/comments/", windowMs: 5 * 60_000 },
  { max: 30, method: "POST", prefix: "/api/comment-votes", windowMs: 60_000 },
  { max: 10, method: "POST", prefix: "/api/comment-reports", windowMs: 60 * 60_000 },
];

// ponytail: in memory, one process; a second web container would need a shared store.
const hits = new Map<string, { count: number; resetAt: number }>();

/** The rule for a request, if its route is limited. */
export const rateLimitRule = (pathname: string, method: string): Rule | undefined =>
  RULES.find((r) => pathname.startsWith(r.prefix) && (!r.method || r.method === method));

/**
 * Fixed window: counts a hit for `client` on `rule` and returns the seconds to wait when it is over the limit,
 * else 0.
 */
export const rateLimited = (client: string, rule: Rule, now = Date.now()): number => {
  if (hits.size > 10_000) for (const [key, hit] of hits) if (hit.resetAt <= now) hits.delete(key);
  const key = `${rule.key ?? `${rule.method ?? "*"} ${rule.prefix}`} ${client}`;
  const hit = hits.get(key);
  if (!hit || hit.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + rule.windowMs });
    return 0;
  }
  return ++hit.count > rule.max ? Math.ceil((hit.resetAt - now) / 1000) : 0;
};

let loggedSource = false;

/**
 * The client's IP: the last X-Forwarded-For entry, the one our reverse proxy (Pangolin/Traefik) appended. The
 * first entries come from the client and can be anything (Astro's clientAddress takes the first). Without the
 * header, the socket address, which behind a tunnel is the same for everyone.
 */
export const clientIp = (forwardedFor: string | null, socketAddress: string): string => {
  const forwarded = forwardedFor?.split(",").at(-1)?.trim();
  if (!loggedSource) {
    loggedSource = true;
    console.info(`[rate-limit] client ip from ${forwarded ? "x-forwarded-for" : "the socket"}`);
  }
  return forwarded || socketAddress;
};
