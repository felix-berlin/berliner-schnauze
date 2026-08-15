import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { z } from "zod";

const changelogs = defineCollection({
  loader: glob({ base: "./docs/user-changelog", pattern: "*.md" }),
  schema: z.object({
    version: z.string(),
    releaseDate: z.string(),
    title: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { changelogs };
