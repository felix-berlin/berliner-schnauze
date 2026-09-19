import { existsSync } from "node:fs";
import { mkdtemp, readdir, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const question = vi.fn();
const close = vi.fn();

vi.mock("node:readline/promises", () => {
  const createInterface = vi.fn(() => ({ close, question }));
  return { createInterface, default: { createInterface } };
});

let root: string;

const load = async () => {
  vi.resetModules();
  vi.spyOn(process, "cwd").mockReturnValue(root);
  return import("@services/devWordsCache");
};

const setTty = (value: boolean) =>
  Object.defineProperty(process.stdin, "isTTY", { configurable: true, value });

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "words-cache-"));
  question.mockReset();
  close.mockReset();
  vi.stubEnv("REFETCH_WORDS", "");
  setTty(false);
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await rm(root, { force: true, recursive: true });
});

const cacheDir = () => join(root, "node_modules/.cache/berliner-words");

describe("readWordsCache / writeWordsCache", () => {
  it("returns null when nothing is cached", async () => {
    const { readWordsCache } = await load();

    expect(await readWordsCache("missing")).toBeNull();
  });

  it("round-trips data through the disk cache", async () => {
    const { readWordsCache, writeWordsCache } = await load();

    await writeWordsCache("words", [{ node: { slug: "aasen" } }]);

    expect(await readWordsCache("words")).toEqual([{ node: { slug: "aasen" } }]);
  });

  it("returns null for a corrupt cache file", async () => {
    const { readWordsCache, writeWordsCache } = await load();
    await writeWordsCache("words", []);
    await writeFile(join(cacheDir(), "words.json"), "{not json");

    expect(await readWordsCache("words")).toBeNull();
  });
});

describe("promptRefetchWords", () => {
  it("does nothing when there is no cache", async () => {
    const { promptRefetchWords } = await load();

    await promptRefetchWords();

    expect(question).not.toHaveBeenCalled();
    expect(existsSync(cacheDir())).toBe(false);
  });

  it("keeps the cache silently without a TTY", async () => {
    const { promptRefetchWords, writeWordsCache } = await load();
    await writeWordsCache("words", []);

    await promptRefetchWords();

    expect(question).not.toHaveBeenCalled();
    expect(await readdir(cacheDir())).toEqual(["words.json"]);
  });

  it("deletes the cache when REFETCH_WORDS=1", async () => {
    vi.stubEnv("REFETCH_WORDS", "1");
    const { promptRefetchWords, writeWordsCache } = await load();
    await writeWordsCache("words", []);

    await promptRefetchWords();

    expect(existsSync(cacheDir())).toBe(false);
  });

  it.each([
    ["j", false],
    ["Ja", false],
    ["n", true],
    ["", true],
  ])("answering %j on a TTY keeps the cache: %s", async (answer, kept) => {
    setTty(true);
    question.mockResolvedValue(answer);
    const { promptRefetchWords, writeWordsCache } = await load();
    await writeWordsCache("words", []);

    await promptRefetchWords();

    expect(question).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalled();
    expect(existsSync(cacheDir())).toBe(kept);
  });

  it.each([
    [10 * 60, "10 minutes"],
    [5 * 3600, "5 hours"],
    [4 * 86_400, "4 days"],
  ])("shows the cache age (%i s → %s)", async (ageSeconds, text) => {
    setTty(true);
    question.mockResolvedValue("n");
    const { promptRefetchWords, writeWordsCache } = await load();
    await writeWordsCache("words", []);
    const past = new Date(Date.now() - ageSeconds * 1000);
    await utimes(join(cacheDir(), "words.json"), past, past);

    await promptRefetchWords();

    expect(question).toHaveBeenCalledWith(expect.stringContaining(text));
  });
});
