import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const changelogs = defineCollection({
  loader: glob({ base: './docs/user-changelog', pattern: '*.md' }),
  schema: z.object({
    version: z.string(),
    releaseDate: z.string(),
    title: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { changelogs };
