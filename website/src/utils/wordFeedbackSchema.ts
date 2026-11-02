import {
  AGES,
  AREAS,
  HALVES,
  ORIGINS,
  REACTIONS,
  USAGES,
  type Age,
  type Area,
  type FeedbackCompare,
  type FeedbackTotals,
  type Half,
  type Origin,
  type Reaction,
  type Usage,
} from "payload-app/word-feedback";
import { z } from "zod";

const opt = <T extends readonly [string, ...string[]]>(values: T) => z.enum(values).nullish();

export const feedbackPatchSchema = z
  .strictObject({
    age: opt(AGES),
    area: opt(AREAS),
    half: opt(HALVES),
    origin: opt(ORIGINS),
    reaction: opt(REACTIONS),
    usage: opt(USAGES),
    word: z.number().int().positive(),
  })
  .refine((v) => v.half == null || v.origin === "grewUp", { message: "half needs origin grewUp" });

export type MyFeedback = {
  age: Age | null;
  area: Area | null;
  half: Half | null;
  origin: Origin | null;
  reaction: Reaction | null;
  usage: Usage | null;
};
export type WordFeedbackState = {
  compare: FeedbackCompare;
  mine: MyFeedback | null;
  totals: FeedbackTotals;
};
