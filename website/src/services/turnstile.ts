import { TURNSTILE_SECRET_KEY } from "astro:env/server";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Checks a Turnstile token with Cloudflare. Fails closed: no token, no secret, a network or parse error all mean `false`. */
export const verifyTurnstile = async (token: string, ip?: string): Promise<boolean> => {
  if (!token || !TURNSTILE_SECRET_KEY) return false;
  const body = new URLSearchParams({ response: token, secret: TURNSTILE_SECRET_KEY });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch(SITEVERIFY, {
      body,
      method: "POST",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    return ((await res.json()) as { success?: unknown }).success === true;
  } catch {
    return false;
  }
};
