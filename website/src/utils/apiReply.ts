import type { ZodType } from "zod";

import { verifyTurnstile } from "@services/turnstile.ts";
import { requestIp } from "@utils/rateLimit.ts";

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
export const isUniqueViolation = (error: unknown, columns = "comment_id, visitor") => {
  const e = error as { data?: { errors?: { path?: string }[] }; name?: string };
  return e?.name === "ValidationError" && e.data?.errors?.[0]?.path === columns;
};

/**
 * The answer to a failed submit: a Payload error below 500 (validation, a hook refusing the input) is the visitor's
 * input and answers 400 with a short text; a 5xx or unknown error stays 502 with the route's own message.
 */
export const submitFailure = (error: unknown, message: string) => {
  const status = (error as { status?: unknown })?.status;
  return typeof status === "number" && status >= 400 && status < 500
    ? reply({ error: "Ditt kann so nich jespeichert werden, prüf mal deine Eingabe." }, 400)
    : reply({ error: message }, 502);
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

/**
 * The common start of a submit route: JSON object body, schema, then the captcha, in that order (nothing is looked up
 * before the visitor passed). `{ response }` is the refusal to send; an invalid input answers the first issue as
 * `{ field, message }`, or the plain "Ungültige Eingabe" with `plainInvalid`.
 */
export const parseSubmission = async <S extends ZodType>(
  request: Request,
  clientAddress: string,
  schema: S,
  { plainInvalid = false } = {},
): Promise<{ data: S["_output"] } | { response: Response }> => {
  const body: unknown = await request.json().catch(() => undefined);
  if (typeof body !== "object" || body === null)
    return { response: reply({ error: "Ungültige Anfrage" }, 400) };

  const input = schema.safeParse(body);
  if (!input.success) {
    const issue = input.error.issues[0]!;
    return {
      response: plainInvalid
        ? reply({ error: "Ungültige Eingabe" }, 400)
        : reply({ field: String(issue.path[0] ?? ""), message: issue.message }, 400),
    };
  }

  const blocked = await captchaGate(
    body,
    requestIp(request.headers.get("x-forwarded-for"), clientAddress),
  );
  return blocked ? { response: blocked } : { data: input.data };
};
