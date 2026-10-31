import type { APIRoute } from "astro";

import { getPayloadClient } from "@services/payload.ts";
import { visitorId } from "@services/payload/comments.ts";
import { voteSchema } from "@utils/commentSchema.ts";

const reply = (body: unknown, status: number) =>
  Response.json(body, { headers: { "Cache-Control": "no-store" }, status });

const orNull = <T>(p: Promise<T>): Promise<T | null> =>
  p.catch((error: unknown) => {
    if ((error as { status?: number })?.status === 404) return null;
    throw error;
  });

/** Postgres' unique violation reaches us as Payload's ValidationError (the only validation we can trip). */
const isUniqueViolation = (error: unknown) =>
  (error as { name?: string })?.name === "ValidationError";

/** One vote per visitor and comment; Payload's hooks recount the comment, we only read it back. */
export const POST: APIRoute = async ({ cookies, request }) => {
  const input = voteSchema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return reply({ error: "Ungültige Eingabe" }, 400);
  const { commentId, value } = input.data;

  try {
    const payload = await getPayloadClient();
    const comment = await orNull(
      payload.findByID({ collection: "comments", depth: 0, id: commentId }),
    );
    if (comment?.status !== "published") return reply({ error: "Kommentar nicht gefunden" }, 404);

    const visitor = visitorId(cookies, true) as string;
    const mine = async () =>
      (
        await payload.find({
          collection: "comment-votes",
          depth: 0,
          limit: 1,
          pagination: false,
          where: { comment: { equals: commentId }, visitor: { equals: visitor } },
        })
      ).docs[0];
    const change = (id: number) =>
      payload.update({ collection: "comment-votes", data: { value }, depth: 0, id });

    const existing = await mine();
    if (value === 0) {
      if (existing) await payload.delete({ collection: "comment-votes", id: existing.id });
    } else if (existing) {
      if (existing.value !== value) await change(existing.id);
    } else {
      try {
        await payload.create({
          collection: "comment-votes",
          data: { comment: commentId, value, visitor },
          depth: 0,
        });
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        // Lost a race against our own double click: the row exists now, so update it.
        const raced = await mine();
        if (!raced) throw error;
        await change(raced.id);
      }
    }

    const fresh = await payload.findByID({ collection: "comments", depth: 0, id: commentId });
    return reply({ downvotes: fresh.downvotes, myVote: value, upvotes: fresh.upvotes }, 200);
  } catch (error) {
    console.error("[comments] vote failed:", error);
    return reply({ error: "Die Stimme konnte leider nicht gezählt werden." }, 502);
  }
};
