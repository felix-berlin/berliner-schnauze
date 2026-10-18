import { TURNSTILE_SECRET_KEY } from "astro:env/server";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** `unavailable`: the check itself is broken (no secret, Cloudflare unreachable or garbled), not the visitor. */
export type TurnstileResult = "pass" | "fail" | "unavailable";

/** Checks a Turnstile token with Cloudflare. Fails closed; every `unavailable` is logged, since it blocks every visitor. */
export const verifyTurnstile = async (token: string, ip?: string): Promise<TurnstileResult> => {
  if (!token) return "fail";
  if (!TURNSTILE_SECRET_KEY) {
    console.error("[turnstile] TURNSTILE_SECRET_KEY is not set");
    return "unavailable";
  }
  const body = new URLSearchParams({ response: token, secret: TURNSTILE_SECRET_KEY });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch(SITEVERIFY, {
      body,
      method: "POST",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error(`[turnstile] siteverify answered ${res.status}`);
      return "unavailable";
    }
    return ((await res.json()) as { success?: unknown }).success === true ? "pass" : "fail";
  } catch (error) {
    console.error("[turnstile] siteverify failed:", error);
    return "unavailable";
  }
};
