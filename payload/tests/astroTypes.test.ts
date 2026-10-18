import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

// src/astro.d.ts is a hand-kept, types-only mirror of src/index.ts for the website's typecheck.
it("astro.d.ts declares every runtime export of index.ts", async () => {
  const mirror = readFileSync(new URL("../src/astro.d.ts", import.meta.url), "utf8");
  const declared = new Set([...mirror.matchAll(/export declare const (\w+)/g)].map((m) => m[1]));
  expect(Object.keys(await import("../src/index")).filter((name) => !declared.has(name))).toEqual(
    [],
  );
});
