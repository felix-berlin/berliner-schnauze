import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";

// Dev-only disk cache for the WordPress word lists: fetching ~6000 words takes ~60
// sequential GraphQL requests, and every dev-server restart would pay for it again
// while all pages and assets wait on it.
const CACHE_DIR = join(process.cwd(), "node_modules/.cache/berliner-words");

const formatAge = (ms: number): string => {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} hours` : `${Math.round(hours / 24)} days`;
};

export const readWordsCache = async <T>(key: string): Promise<T | null> => {
  try {
    return JSON.parse(await readFile(join(CACHE_DIR, `${key}.json`), "utf8")) as T;
  } catch {
    return null;
  }
};

export const writeWordsCache = async (key: string, data: unknown): Promise<void> => {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(join(CACHE_DIR, `${key}.json`), JSON.stringify(data));
};

/**
 * Asks once at dev-server start whether the cached words should be re-fetched.
 * Without a TTY (agents, Playwright webServer) the cache is kept silently;
 * `REFETCH_WORDS=1` forces a refetch.
 */
export const promptRefetchWords = async (): Promise<void> => {
  // Config-change restarts re-import this module in the same process; env survives, module state doesn't.
  if (process.env.WORDS_CACHE_PROMPTED) return;
  process.env.WORDS_CACHE_PROMPTED = "1";

  const files = await readdir(CACHE_DIR).catch(() => []);
  if (files.length === 0) return;

  let refetch = process.env.REFETCH_WORDS === "1";

  if (!refetch && process.stdin.isTTY) {
    const oldest = Math.min(
      ...(await Promise.all(files.map(async (f) => (await stat(join(CACHE_DIR, f))).mtimeMs))),
    );
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(
      `Re-fetch words? The cached entries are ${formatAge(Date.now() - oldest)} old. [y/N] `,
    );
    rl.close();
    refetch = /^(y|yes|j|ja)$/i.test(answer.trim());
  }

  if (refetch) await rm(CACHE_DIR, { force: true, recursive: true });
};
