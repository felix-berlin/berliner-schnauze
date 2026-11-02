import {
  AGES,
  AREAS,
  HALVES,
  ORIGINS,
  LOCALITIES,
  LOCALITY_AREA,
  REACTIONS,
  USAGES,
  type Age,
  type Area,
  type FeedbackCompare,
  type FeedbackTotals,
  type Half,
  type Locality,
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
    locality: opt(LOCALITIES),
    origin: opt(ORIGINS),
    reaction: opt(REACTIONS),
    usage: opt(USAGES),
    word: z.number().int().positive(),
  })
  .refine((v) => v.half == null || v.origin === "grewUp", { message: "half needs origin grewUp" })
  .refine((v) => v.locality == null || LOCALITY_AREA[v.locality] === v.area, {
    message: "locality needs its own area",
  });

export type MyFeedback = {
  age: Age | null;
  area: Area | null;
  half: Half | null;
  locality: Locality | null;
  origin: Origin | null;
  reaction: Reaction | null;
  usage: Usage | null;
};
export type WordFeedbackState = {
  compare: FeedbackCompare;
  mine: MyFeedback | null;
  totals: FeedbackTotals;
};
