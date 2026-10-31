import { COMMENT_MAX, NAME_MAX } from "payload-app/comments";
import { z } from "zod";

const id = z.number().int().positive();
const text = z
  .string()
  .trim()
  .min(2, "Mehr als een Buchstabe sollte's schon sein.")
  .max(COMMENT_MAX, "Ditt is ein bisken zu lang.");

export const commentCreateSchema = z.object({
  authorName: z.string().trim().max(NAME_MAX, "Ditt is ein bisken zu lang.").default(""),
  parentId: id.optional(),
  text,
  wordId: id,
});

export const commentEditSchema = z.object({ editKey: z.string().min(32), text });

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
