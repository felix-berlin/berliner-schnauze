import type { APIRoute } from "astro";

import { getPayloadClient } from "@services/payload.ts";
import { hashEditKey, toPublic } from "@services/payload/comments.ts";
import { orNull, reply } from "@utils/apiReply.ts";
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

const handle =
  (schema: z.ZodType<{ editKey: string; text?: string }>): APIRoute =>
  async ({ params, request }) => {
    const id = Number(params.id);
    const body: unknown = await request.json().catch(() => undefined);
    const input = schema.safeParse(body);
    if (!/^[1-9]\d{0,8}$/.test(params.id ?? "") || !input.success)
      return reply({ error: "Ungültige Eingabe" }, 400);

    try {
      const own = await ownComment(id, input.data.editKey);
      if (!own) return forbidden();
      const { text } = input.data;
      const updated = await own.payload.update({
        collection: "comments",
        data: text === undefined ? { authorName: null, status: "deleted", text: "[gelöscht]" } : { text },
        depth: 0,
        id,
      });
      if (text === undefined) return reply({ deleted: true }, 200);
      // The hook decides: a link in the new text sends the comment back to review.
      const pending = updated.status === "pending";
      return reply(pending ? { pending } : { comment: toPublic(updated), pending }, 200);
    } catch (error) {
      console.error("[comments] own update failed:", error);
      return reply({ error: "Das hat leider nicht geklappt." }, 502);
    }
  };

export const PATCH = handle(commentEditSchema);
export const DELETE = handle(deleteSchema);
