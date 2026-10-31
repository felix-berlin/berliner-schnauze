import type { APIRoute } from "astro";

import { getPayloadClient, siteRead } from "@services/payload.ts";
import { hashEditKey, listComments, toPublic, visitorId } from "@services/payload/comments.ts";
import { verifyTurnstile } from "@services/turnstile.ts";
import { orNull, reply } from "@utils/apiReply.ts";
import { commentCreateSchema } from "@utils/commentSchema.ts";
import { createHash, randomBytes } from "node:crypto";
import { pickPseudonym } from "payload-app/comments";

/** Only published words have comments (siteRead hides drafts). */
const publishedWord = async (wordId: number) =>
  orNull(
    (await getPayloadClient()).findByID({
      collection: "words",
      depth: 0,
      id: wordId,
      ...siteRead(),
    }),
  );

const positiveInt = (v: string | null, fallback?: number) =>
  v === null ? fallback : /^[1-9]\d{0,8}$/.test(v) ? Number(v) : undefined;

export const GET: APIRoute = async ({ cookies, url }) => {
  const wordId = positiveInt(url.searchParams.get("word"));
  const page = positiveInt(url.searchParams.get("page"), 1);
  const sort = url.searchParams.get("sort") ?? "best";
  if (!wordId || !page || (sort !== "best" && sort !== "new"))
    return reply({ error: "Ungültige Anfrage" }, 400);

  try {
    if (!(await publishedWord(wordId))) return reply({ error: "Wort nicht gefunden" }, 404);
    return reply(await listComments(wordId, sort, page, visitorId(cookies, false)), 200);
  } catch (error) {
    console.error("[comments] listing failed:", error);
    return reply({ error: "Die Kommentare konnten nicht geladen werden." }, 502);
  }
};

/** Validates, checks Turnstile, then stores the comment; Payload's hook decides published or pending. */
export const POST: APIRoute = async ({ clientAddress, cookies, request }) => {
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
    if (!(await publishedWord(wordId))) return reply({ error: "Wort nicht gefunden" }, 404);

    if (parentId) {
      const parent = await orNull(
        payload.findByID({ collection: "comments", depth: 0, id: parentId }),
      );
      const parentWord = typeof parent?.word === "object" ? parent.word.id : parent?.word;
      if (!parent || parent.status !== "published" || parentWord !== wordId)
        return reply({ error: "Ungültige Anfrage" }, 400);
    }

    // Per-word handle: the same visitor keeps one pseudonym within a word, but cannot be linked across words.
    const authorTag = createHash("sha256")
      .update(`${visitorId(cookies, true)}:${wordId}`)
      .digest("hex")
      .slice(0, 16);
    let pseudonym: string | undefined;
    if (!authorName) {
      const word = { equals: wordId };
      const mine = await payload.find({
        collection: "comments",
        depth: 0,
        limit: 1,
        select: { pseudonym: true },
        where: { authorTag: { equals: authorTag }, pseudonym: { exists: true }, word },
      });
      pseudonym = mine.docs[0]?.pseudonym ?? undefined;
      if (!pseudonym) {
        const used = await payload.find({
          collection: "comments",
          depth: 0,
          pagination: false,
          select: { pseudonym: true },
          where: { pseudonym: { exists: true }, word },
        });
        pseudonym = pickPseudonym(authorTag, new Set(used.docs.flatMap((d) => d.pseudonym ?? [])));
      }
    }

    const editKey = randomBytes(32).toString("base64url");
    const created = await payload.create({
      collection: "comments",
      data: {
        authorName,
        authorTag,
        editKeyHash: hashEditKey(editKey),
        parent: parentId,
        pseudonym,
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
