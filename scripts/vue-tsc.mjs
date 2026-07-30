#!/usr/bin/env node
// vue-tsc's CLI defaults to `require.resolve('typescript/lib/tsc')`, which
// crashes immediately under TypeScript 7 (no classic API/subpath exports).
// vue-tsc 3.3.8 added TS7 support by accepting an explicit tsc path and
// redirecting to `@typescript/typescript6` (Microsoft's TS6 compat shim)
// when given one — see https://github.com/vuejs/language-tools/releases/tag/v3.3.8.
// Call run() directly with that path instead of going through the bin,
// since `typescript` is a shared peerDependency singleton (real TS7) and
// can't be swapped out per-consumer via pnpm overrides.
import { createRequire } from "node:module";
import { run } from "vue-tsc";

const require = createRequire(import.meta.url);
run(require.resolve("@typescript/typescript6/lib/tsc"));
