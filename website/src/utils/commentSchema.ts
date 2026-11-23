import { z } from "zod";

const id = z.number().int().positive();

export const voteSchema = z.object({
  commentId: id,
  value: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
});

export const reportSchema = z.object({
  commentId: id,
  reason: z.string().trim().max(300, "Ditt is ein bisken zu lang.").default(""),
});
