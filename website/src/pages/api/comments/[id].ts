import type { APIRoute } from "astro";

import { getPayloadClient } from "@services/payload.ts";
import { getThread, hashEditKey, toPublic, visitorId } from "@services/payload/comments.ts";
import { orNull, positiveInt, reply } from "@utils/apiReply.ts";
import { commentEditSchema } from "@utils/commentSchema.ts";
import { timingSafeEqual } from "node:crypto";
import { EDIT_WINDOW_MS } from "payload-app/comments";
import { z } from "zod";

/** One body for every refusal, so a probe can't tell unknown id from wrong key or expired window. */
const forbidden = () => reply({ error: "Dit jeht nich mehr." }, 403);

const deleteSchema = commentEditSchema.pick({ editKey: true });

/** The stored comment if `editKey` matches, it is still editable and inside the edit window. */
const ownComment = async (id: number, editKey: string) => {
  const payload = await getPayloadClient();
  const c = await orNull(payload.findByID({ collection: "comments", depth: 0, id }));
  if (!c || (c.status !== "published" && c.status !== "pending")) return null;
  if (Date.now() - new Date(c.createdAt).getTime() > EDIT_WINDOW_MS) return null;
  const given = Buffer.from(hashEditKey(editKey));
  const stored = Buffer.from(c.editKeyHash ?? "");
  return given.length === stored.length && timingSafeEqual(given, stored) ? { c, payload } : null;
};

/** Shared by PATCH and DELETE: parses the body, checks the edit key, applies `change(input)` and answers. */
const own =
  <T extends { editKey: string }>(
    schema: z.ZodType<T>,
    change: (input: T) => Record<string, unknown>,
    answer: (updated: Awaited<ReturnType<typeof applyChange>>) => Response,
  ): APIRoute =>
  async ({ params, request }) => {
    const id = positiveInt(params.id);
    const input = schema.safeParse(await request.json().catch(() => undefined));
    if (!id || !input.success) return reply({ error: "Ungültige Eingabe" }, 400);
    try {
      const found = await ownComment(id, input.data.editKey);
      if (!found) return forbidden();
      return answer(await applyChange(found.payload, id, change(input.data)));
    } catch (error) {
      console.error("[comments] own update failed:", error);
      return reply({ error: "Das hat leider nicht geklappt." }, 502);
    }
  };

const applyChange = (
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  id: number,
  data: Record<string, unknown>,
) => payload.update({ collection: "comments", data, depth: 0, id });

// The hook decides: a link in the new text sends the comment back to review.
export const PATCH = own(
  commentEditSchema,
  ({ text }) => ({ text }),
  (updated) =>
    reply(
      updated.status === "pending"
        ? { pending: true }
        : { comment: toPublic(updated), pending: false },
      200,
    ),
);
export const DELETE = own(
  deleteSchema,
  () => ({ authorName: null, pseudonym: null, status: "deleted", text: "[gelöscht]" }),
  () => reply({ deleted: true }, 200),
);

/** The thread a comment belongs to, same shape and visibility as the list; for links to one comment. */
export const GET: APIRoute = async ({ cookies, params }) => {
  const id = positiveInt(params.id);
  if (!id) return reply({ error: "Ungültige Anfrage" }, 400);
  try {
    const comment = await getThread(id, visitorId(cookies, false));
    return comment ? reply({ comment }, 200) : reply({ error: "Kommentar nicht gefunden" }, 404);
  } catch (error) {
    console.error("[comments] thread failed:", error);
    return reply({ error: "Der Kommentar konnte nicht geladen werden." }, 502);
  }
};
