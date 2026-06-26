# Test Helpers Refactor — Shared Utilities & Icon Stub Plugin

> **For agentic workers:** Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to implement this plan step-by-step. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce boilerplate across 137 unit test files by (a) adding a Vite plugin that auto-stubs all Lucide icon imports during tests — eliminating ~20 per-file `vi.mock()` blocks — and (b) introducing shared helper functions for the most-repeated patterns (AstroContainer setup, nanostores `useStore` wiring, component stubs).

**Scope:** `src/tests/unit/` only. No production code changes. Coverage must not regress.

**Audit source:** Subagent audit Jun 26 2026 — 137 files, 79 Vue component tests, 58 utility/service tests.

---

## Global Constraints

- Import aliases always: `@components/*`, `@stores/*`, `@utils/*`, `@styles/*`, `@/*` — never relative paths in production code; helpers live in `src/tests/unit/helpers/` and may use relative paths internally.
- `vi.mock()` is hoisted by Vitest — it **cannot** be called from inside imported helper functions. Icon stubs must therefore be handled at the plugin/config level, not via per-file helpers.
- Run tests: `pnpm test:unit` | single file: `pnpm vitest run <path>`
- Lint: `pnpm lint`

---

## Phase 0: Audit Summary (already complete)

### Key Findings

| Pattern | File count | Pain |
|---|---|---|
| Icon mocks (`virtual:icons/lucide/*`) | ~20 files | 3–4 inconsistent styles, 1–5 `vi.mock()` blocks per file |
| Store mocks with `useStore` wiring | 29 files | 15+ line boilerplate per file |
| AstroContainer setup in `beforeAll` | ~10 files | 7-line block duplicated verbatim |
| SCSS module mocks | 4 files | trivial `vi.mock("...", () => ({}))` |
| No shared helpers file | — | every file reimplements patterns |

### Allowed APIs (verified from existing test files)

- `vi.mock(modulePath, factory)` — hoisted, can't call imported functions inside factory
- `AstroContainer.create()` from `astro/container` — expensive, must be in `beforeAll`
- `config.global.stubs` from `@vue/test-utils` — safe for `defineAsyncComponent` stubs
- Vite plugin API: `resolveId(id)` + `load(id)` — works inside `getViteConfig({ plugins: [...] })`

---

## Phase 1: Icon Stub Vite Plugin

**What:** Add a plugin to `vitest.config.ts` that intercepts every `virtual:icons/lucide/*` import and returns a lightweight stub component. This removes all ~20 `vi.mock("virtual:icons/lucide/...")` blocks from individual test files.

**Why a plugin and not `vi.mock`:** `vi.mock()` is hoisted and scoped per-file; a Vite plugin resolves before module loading and applies globally with zero per-file cost.

### Files to change

| File | Action |
|---|---|
| `vitest.config.ts` | Add `plugins: [iconStubPlugin()]` |

### Implementation

```typescript
// at the top of vitest.config.ts, before getViteConfig():
import type { Plugin } from "vite";

function iconStubPlugin(): Plugin {
  return {
    name: "vitest-icon-stub",
    enforce: "pre",
    resolveId(id) {
      if (id.startsWith("virtual:icons/") || id.startsWith("~icons/")) {
        return "\0" + id;
      }
    },
    load(id) {
      if (id.startsWith("\0virtual:icons/") || id.startsWith("\0~icons/")) {
        const name = id.replace(/^\0(virtual:icons|~icons)\//, "").replace(/\//g, "-");
        return `export default { template: '<span data-testid="icon-${name}" />' };`;
      }
    },
  };
}

// in getViteConfig({ ... }):
export default getViteConfig(
  {
    plugins: [iconStubPlugin()],  // ← add this
    test: { ... },
  } as any,
  { env: { ... } },
);
```

### After plugin is added — remove per-file icon mocks

Search for files containing icon mock blocks and delete them:

```bash
grep -rl 'virtual:icons/lucide' src/tests/unit/
```

Remove every block matching:
```typescript
vi.mock("virtual:icons/lucide/...", ...);
```

The plugin handles all of them automatically.

- [ ] Add `iconStubPlugin()` function to `vitest.config.ts`
- [ ] Add `plugins: [iconStubPlugin()]` inside `getViteConfig()`
- [ ] Run `pnpm test:unit` — all tests must pass
- [ ] Run `grep -rl 'virtual:icons/lucide' src/tests/unit/` — list files with icon mocks
- [ ] Delete all `vi.mock("virtual:icons/lucide/...")` blocks from those files
- [ ] Run `pnpm test:unit` again — verify no regressions

**Anti-patterns:**
- Do NOT add the plugin to `astro.config.mjs` (production build)
- Do NOT use `vi.mock` with a glob/regex — Vitest doesn't support wildcards

---

## Phase 2: Shared Test Helpers

**What:** Create `src/tests/unit/helpers/` with three utility modules.

### 2a — AstroContainer helper (`helpers/astro.ts`)

Replaces the 7-line `beforeAll` boilerplate in every Astro component test.

**Before (current pattern in WordSectionLinguistik.test.ts):**
```typescript
let container: InstanceType<typeof AstroContainer>;
let WordSectionLinguistik: any;

beforeAll(async () => {
  container = await AstroContainer.create();
  const mod = await import("@components/word/WordSectionLinguistik.astro");
  WordSectionLinguistik = mod.default;
}, 30_000);

async function render(props: Record<string, unknown>) {
  return container.renderToString(WordSectionLinguistik, { props });
}
```

**After (with helper):**
```typescript
import { createAstroRender } from "../helpers/astro";

let render: (props: Record<string, unknown>) => Promise<string>;

beforeAll(async () => {
  const { default: WordSectionLinguistik } = await import("@components/word/WordSectionLinguistik.astro");
  render = await createAstroRender(WordSectionLinguistik);
}, 30_000);
```

**Helper implementation (`src/tests/unit/helpers/astro.ts`):**
```typescript
import { experimental_AstroContainer as AstroContainer } from "astro/container";

export async function createAstroRender(component: unknown) {
  const container = await AstroContainer.create();
  return (props: Record<string, unknown>) =>
    container.renderToString(component as Parameters<typeof container.renderToString>[0], { props });
}
```

### 2b — Store mock helper (`helpers/stores.ts`)

Reduces the verbose `useStore.mockImplementation` pattern in 29 files.

**Before (current pattern in InstallApp.test.ts):**
```typescript
beforeEach(() => {
  mockedUseStore.mockImplementation((store: unknown) => {
    if (store === installAppStore.$installPrompt) return installPromptRef;
    if (store === installAppStore.$showInstallButton) return showInstallButtonRef;
    if (store === installAppStore.$isPwaInstalled) return isPwaInstalledRef;
    return ref(null);
  });
});
```

**After:**
```typescript
import { createStoreMockImpl } from "../helpers/stores";

beforeEach(() => {
  mockedUseStore.mockImplementation(
    createStoreMockImpl([
      [installAppStore.$installPrompt, installPromptRef],
      [installAppStore.$showInstallButton, showInstallButtonRef],
      [installAppStore.$isPwaInstalled, isPwaInstalledRef],
    ])
  );
});
```

**Helper implementation (`src/tests/unit/helpers/stores.ts`):**
```typescript
import { ref, type Ref } from "vue";

type StoreEntry = [unknown, Ref<unknown>];

export function createStoreMockImpl(storeMap: StoreEntry[]) {
  return (store: unknown): Ref<unknown> => {
    const entry = storeMap.find(([s]) => s === store);
    return entry ? entry[1] : ref(null);
  };
}
```

### 2c — Component stub helper (`helpers/stubs.ts`)

Standardizes the Proxy-wrapped component stub pattern (prevents Vitest `__isTeleport`/`__isKeepAlive` errors).

```typescript
// src/tests/unit/helpers/stubs.ts

/** Creates a Vue component stub safe for use with vi.mock() and config.global.stubs */
export function createComponentStub(template = "<div><slot /></div>") {
  const mod: Record<string | symbol, unknown> = {
    default: { template },
  };
  return new Proxy(mod, {
    has: () => true,
    get(t, k) { return k in t ? t[k] : undefined; },
  });
}

/** Stub for use in config.global.stubs (not for vi.mock) */
export function createSlotStub(name: string, template?: string) {
  return {
    name,
    template: template ?? `<div class="stub-${name}"><slot /></div>`,
  };
}
```

### 2d — Barrel export (`helpers/index.ts`)

```typescript
export * from "./astro";
export * from "./stores";
export * from "./stubs";
```

- [ ] Create `src/tests/unit/helpers/astro.ts`
- [ ] Create `src/tests/unit/helpers/stores.ts`
- [ ] Create `src/tests/unit/helpers/stubs.ts`
- [ ] Create `src/tests/unit/helpers/index.ts`
- [ ] Run `pnpm test:unit` — must still pass (helpers not used yet)

---

## Phase 3: Migrate Astro Component Tests to `createAstroRender`

**Files to migrate** (all use the `AstroContainer.create()` + `beforeAll` pattern):

```
src/tests/unit/components/word/WordCuriosities.test.ts
src/tests/unit/components/word/WordDecomposition.test.ts
src/tests/unit/components/word/WordLetterFrequency.test.ts
src/tests/unit/components/word/WordSectionGrammatik.test.ts
src/tests/unit/components/word/WordSectionLinguistik.test.ts
src/tests/unit/components/word/WordSectionOrthographie.test.ts
src/tests/unit/components/FactCard.test.ts
src/tests/unit/components/GameCtaCard.test.ts
src/tests/unit/components/SetColorMode.test.ts
src/tests/unit/components/WakapiStats.test.ts
src/tests/unit/components/word/WordHero.test.ts
src/tests/unit/components/word/WordAnagrams.test.ts
```

**For each file:**
1. Add import: `import { createAstroRender } from "../helpers/astro";` (adjust relative path)
2. Remove `let container: InstanceType<typeof AstroContainer>;` and component variable
3. Change `let render` type to `(props: Record<string, unknown>) => Promise<string>`
4. Simplify `beforeAll` body to two lines (import + `createAstroRender`)
5. Remove the inline `async function render(...)` definition

- [ ] Migrate all Astro component test files listed above
- [ ] Run `pnpm test:unit` — all must pass

---

## Phase 4: Migrate `useStore` Tests to `createStoreMockImpl`

**Files to migrate** (high value — most repeated boilerplate):

```bash
grep -rl 'mockImplementation.*store' src/tests/unit/
```

Priority targets based on audit:
- `src/tests/unit/components/InstallApp.test.ts`
- `src/tests/unit/components/WordOfTheDay.test.ts`
- Any file with 3+ `if (store === ...)` branches in `mockImplementation`

**For each file:**
1. Add: `import { createStoreMockImpl } from "../helpers/stores";`
2. Replace the `mockImplementation((store) => { if ... if ... return ref(null) })` block with `createStoreMockImpl([...])`

- [ ] Identify all files with multi-branch `useStore.mockImplementation`
- [ ] Migrate them to `createStoreMockImpl`
- [ ] Run `pnpm test:unit`

---

## Phase 5: Standardize `vi.mock` Component Stubs (Optional Polish)

Files using inconsistent `vi.mock` for component stubs (e.g. `AppSettings.test.ts`):
- Replace ad-hoc Proxy objects with `createComponentStub()` from `helpers/stubs.ts`
- Replace `beforeAll(() => { config.global.stubs.X = ... })` with `createSlotStub()` where applicable

This phase is optional — only worth doing if test count for these files is low and the benefit is clear.

- [ ] Review `AppSettings.test.ts` for Proxy stub pattern
- [ ] Replace with `createComponentStub()` if cleaner
- [ ] Run `pnpm test:unit`

---

## Phase 6: Verification

- [ ] `pnpm test:unit` — all 137 files pass, 1592+ tests green
- [ ] Coverage numbers at or above baseline:
  - Statements ≥ 92.96%
  - Branches ≥ 90.89%
  - Functions ≥ 91.21%
  - Lines ≥ 93.02%
- [ ] `pnpm lint` — no lint errors
- [ ] `grep -rl 'virtual:icons/lucide' src/tests/unit/` returns empty (all icon mocks removed)
- [ ] Confirm `src/tests/unit/helpers/` has 4 files: `astro.ts`, `stores.ts`, `stubs.ts`, `index.ts`

---

## Anti-Pattern Guards

| Anti-pattern | Why it breaks |
|---|---|
| Calling helper inside `vi.mock()` factory | `vi.mock` is hoisted — imports aren't available at hoist time |
| Adding icon stub plugin to `astro.config.mjs` | Breaks production icon loading |
| Using `vi.doMock()` for icons | Not hoisted — race conditions between import and mock |
| Removing `beforeAll` timeout (30_000) | AstroContainer.create() can take >5s on first call |
| Using `vi.mock` with regex/glob | Vitest doesn't support wildcard module matching |
| Calling `delete config.global.stubs.X` at runtime | Triggers Vitest Proxy `__isKeepAlive` errors in subsequent mounts |
