import { verifyTurnstile } from "@services/turnstile.ts";

export const reply = (body: unknown, status: number) =>
  Response.json(body, { headers: { "Cache-Control": "no-store" }, status });

/** Payload's NotFound (status 404) means "no such doc"; anything else (DB down ...) must surface. */
export const orNull = <T>(p: Promise<T>): Promise<T | null> =>
  p.catch((error: unknown) => {
    if ((error as { status?: number })?.status === 404) return null;
    throw error;
  });

/**
 * Postgres' unique violation on (comment, visitor), as Payload throws it: a ValidationError whose
 * first error path is the index columns (pinned by payload/tests/comments.test.ts). Hook errors don't match.
 */
export const isUniqueViolation = (error: unknown) => {
  const e = error as { data?: { errors?: { path?: string }[] }; name?: string };
  return e?.name === "ValidationError" && e.data?.errors?.[0]?.path === "comment_id, visitor";
};

/** Positive integer from a string (≤ 9 digits), else undefined; `null` yields `fallback`. */
export const positiveInt = (v: string | null | undefined, fallback?: number) =>
  v == null ? fallback : /^[1-9]\d{0,8}$/.test(v) ? Number(v) : undefined;

/** Verifies the body's `turnstileToken`; returns the refusal to send, or null when the visitor passed. */
export const captchaGate = async (body: unknown, ip?: string): Promise<Response | null> => {
  const token = (body as { turnstileToken?: unknown }).turnstileToken;
  const captcha = typeof token === "string" ? await verifyTurnstile(token, ip) : "fail";
  if (captcha === "unavailable")
    return reply(
      { error: "Die Captcha-Prüfung ist gerade gestört, bitte versuch es später nochmal." },
      503,
    );
  return captcha === "fail" ? reply({ error: "Captcha nicht bestanden" }, 403) : null;
};
