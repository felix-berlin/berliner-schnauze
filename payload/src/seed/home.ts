/**
 * Seeds the start page texts (global `home`): intro, knowledge, sound rules, FAQ, about, try-words. Only writes
 * fields that are still empty, so a second run changes nothing and edited fields survive. Creates no words.
 * Usage: `scripts/with-env.sh pnpm --filter payload-app seed:home` (local worktree database only).
 */
import type { Payload } from "payload";

import { htmlToLexical } from "../lib/htmlToLexical";
import { assertDevDatabase } from "./dev";
import {
  HOME_ABOUT_TEXT,
  HOME_BROWSE_LINKS,
  HOME_FAQ,
  HOME_INTRO,
  HOME_KNOWLEDGE_HTML,
  HOME_SOUND_RULES,
  HOME_TRY_WORD_SLUGS,
} from "./homeContent";

export async function seedHome(
  payload: Payload,
  tryWordSlugs: string[] = HOME_TRY_WORD_SLUGS,
): Promise<{ written: string[]; skipped: string[] }> {
  const home = await payload.findGlobal({ slug: "home", depth: 0 });
  const data: Record<string, unknown> = {};
  const written: string[] = [];
  const skipped: string[] = [];
  /** Queues `value()` for `name` when the field is empty; `value` returns undefined when there is nothing to write. */
  const fill = async (name: string, empty: boolean, value: () => unknown) => {
    const v = empty ? await value() : undefined;
    if (v === undefined) skipped.push(name);
    else {
      data[name] = v;
      written.push(name);
    }
  };

  await fill("intro", !home.intro, () => HOME_INTRO);
  await fill("knowledge", !home.knowledge, () =>
    htmlToLexical(HOME_KNOWLEDGE_HTML, payload.config),
  );
  await fill("soundRules", !home.soundRules?.length, () => HOME_SOUND_RULES);
  await fill("faq", !home.faq?.length, async () =>
    Promise.all(
      HOME_FAQ.map(async (f) => ({
        question: f.question,
        answer: await htmlToLexical(f.answerHtml, payload.config),
      })),
    ),
  );
  await fill("browseLinks", !home.browseLinks?.length, () => HOME_BROWSE_LINKS);
  await fill("aboutText", !home.aboutText, () => HOME_ABOUT_TEXT);
  await fill("tryWords", !home.tryWords?.length, async () => {
    const { docs } = await payload.find({
      collection: "words",
      where: { slug: { in: tryWordSlugs } },
      limit: tryWordSlugs.length,
      depth: 0,
      pagination: false,
    });
    // Keep the mock's order; unknown slugs are simply missing.
    const ids = tryWordSlugs.flatMap((s) => docs.filter((d) => d.slug === s).map((d) => d.id));
    return ids.length ? ids : undefined;
  });

  if (written.length) await payload.updateGlobal({ slug: "home", data, depth: 0 });
  return { written, skipped };
}

// CLI entry (`payload run src/seed/home.ts`); tests import this module without running it.
if (!process.env.VITEST) {
  assertDevDatabase(process.env.DATABASE_URL);
  const [{ getPayload }, { default: config }] = await Promise.all([
    import("payload"),
    import("../payload.config"),
  ]);
  const { written, skipped } = await seedHome(await getPayload({ config }));
  console.log(
    `[seed] home written: ${written.join(", ") || "-"}; skipped: ${skipped.join(", ") || "-"}`,
  );
  process.exit(0);
}
