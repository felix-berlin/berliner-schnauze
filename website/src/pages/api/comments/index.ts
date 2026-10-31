import { createHash, randomBytes } from "node:crypto";

import type { APIRoute } from "astro";

import { getPayloadClient, siteRead } from "@services/payload.ts";
import { listComments, toPublic, visitorId } from "@services/payload/comments.ts";
import { verifyTurnstile } from "@services/turnstile.ts";
import { commentCreateSchema } from "@utils/commentSchema.ts";

const reply = (body: unknown, status: number) =>
  Response.json(body, { headers: { "Cache-Control": "no-store" }, status });

const positiveInt = (v: string | null, fallback?: number) =>
  v === null ? fallback : /^[1-9]\d{0,8}$/.test(v) ? Number(v) : undefined;

export const GET: APIRoute = async ({ cookies, url }) => {
  const wordId = positiveInt(url.searchParams.get("word"));
  const page = positiveInt(url.searchParams.get("page"), 1);
  const sort = url.searchParams.get("sort") ?? "best";
  if (!wordId || !page || (sort !== "best" && sort !== "new"))
    return reply({ error: "Ungültige Anfrage" }, 400);

  try {
    return reply(await listComments(wordId, sort, page, visitorId(cookies, false)), 200);
  } catch (error) {
    console.error("[comments] listing failed:", error);
    return reply({ error: "Die Kommentare konnten nicht geladen werden." }, 502);
  }
};

/** Validates, checks Turnstile, then stores the comment; Payload's hook decides published or pending. */
export const POST: APIRoute = async ({ clientAddress, request }) => {
  const body: unknown = await request.json().catch(() => undefined);
  if (typeof body !== "object" || body === null) return reply({ error: "Ungültige Anfrage" }, 400);

  const input = commentCreateSchema.safeParse(body);
  if (!input.success) return reply({ error: "Ungültige Eingabe" }, 400);

  const token = (body as { turnstileToken?: unknown }).turnstileToken;
  const captcha = typeof token === "string" ? await verifyTurnstile(token, clientAddress) : "fail";
  if (captcha === "unavailable")
    return reply(
      { error: "Die Captcha-Prüfung ist gerade gestört, bitte versuch es später nochmal." },
      503,
    );
  if (captcha === "fail") return reply({ error: "Captcha nicht bestanden" }, 403);

  const { authorName, parentId, text, wordId } = input.data;
  try {
    const payload = await getPayloadClient();
    // Only published words take comments (siteRead hides drafts).
    const word = await payload
      .findByID({ collection: "words", depth: 0, id: wordId, ...siteRead() })
      .catch(() => null);
    if (!word) return reply({ error: "Wort nicht gefunden" }, 404);

    if (parentId) {
      const parent = await payload
        .findByID({ collection: "comments", depth: 0, id: parentId })
        .catch(() => null);
      const parentWord = typeof parent?.word === "object" ? parent.word.id : parent?.word;
      if (!parent || parent.status !== "published" || parentWord !== wordId)
        return reply({ error: "Ungültige Anfrage" }, 400);
    }

    const editKey = randomBytes(32).toString("base64url");
    const created = await payload.create({
      collection: "comments",
      data: {
        authorName,
        editKeyHash: createHash("sha256").update(editKey).digest("hex"),
        parent: parentId,
        text,
        word: wordId,
      },
      depth: 0,
    });
    const pending = created.status === "pending";
    return reply(
      pending ? { editKey, pending } : { comment: toPublic(created), editKey, pending },
      201,
    );
  } catch (error) {
    console.error("[comments] storing failed:", error);
    return reply({ error: "Dein Kommentar konnte leider nicht gesendet werden." }, 502);
  }
};
