import { visibleName } from "payload-app/bon-names";
import { COMMENT_MAX, COMMENT_MIN, NAME_MAX } from "payload-app/comments";
import { z } from "zod";

const id = z.number().int().positive();
// Format characters (bidi overrides, zero-width) dropped like in BON names: "\u202E" would flip the rendered text.
const visible = z.string().transform(visibleName).pipe(z.string().trim());

const text = visible.pipe(
  z
    .string()
    .min(COMMENT_MIN, "Bisken mehr musste schon schreiben.")
    .max(COMMENT_MAX, "Ditt is ein bisken zu lang."),
);

export const commentCreateSchema = z.object({
  authorName: visible.pipe(z.string().max(NAME_MAX, "Ditt is ein bisken zu lang.")).default(""),
  parentId: id.optional(),
  text,
  wordId: id,
});

export const commentEditSchema = z.object({ editKey: z.string().min(32).max(64), text });

export const voteSchema = z.object({
  commentId: id,
  value: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
});

export const reportSchema = z.object({
  commentId: id,
  reason: z.string().trim().max(300, "Ditt is ein bisken zu lang.").default(""),
});

export type PublicComment = {
  id: number;
  parentId: number | null;
  authorName: string;
  /** null unless `state` is "visible" */
  text: string | null;
  state: "visible" | "removed" | "reviewing";
  removalReason: string | null;
  createdAt: string;
  edited: boolean;
  upvotes: number;
  downvotes: number;
  myVote: -1 | 0 | 1;
  replies: PublicComment[];
};
