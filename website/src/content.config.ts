import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

const changelogs = defineCollection({
  loader: glob({ base: "../docs/user-changelog", pattern: "*.md" }),
  schema: z.object({
    version: z.string(),
    releaseDate: z.string(),
    title: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { changelogs };
