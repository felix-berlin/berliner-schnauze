# Imagor Image Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver all content images (WordPress media, Wikimedia files, Amazon affiliate book covers) through the self-hosted Imagor instance at `https://assets.kasimir.dev`, signed with HMAC-SHA256, via a custom Astro external Image Service — with zero changes to existing `<Picture>`/`getImage()` call sites.

**Architecture:** A custom Astro `ExternalImageService` (`image.service.entrypoint`) replaces the built-in Sharp service. It reuses Astro's own `baseService` for `validateOptions`/`getSrcSet`/`getHTMLAttributes` (transform-shape logic that's identical regardless of backend) and only overrides `getURL` to build and HMAC-sign an Imagor URL instead of pointing at Astro's local `/_image` endpoint. Signing is pure string/crypto logic (Node `crypto.createHmac`) — no network call at build time.

**Tech Stack:** Astro 7 (`astro:assets` custom Image Service API), Node `node:crypto`, Vitest for unit tests, `astro:env/server` for secrets.

**Spec:** `docs/superpowers/specs/2026-08-15-imagor-image-service-design.md`

## Global Constraints

- Package manager is pnpm only — never `npm`/`yarn` (enforced by `preinstall`).
- Secrets/env vars go through the `astro:env` schema in `astro.config.mjs` (`envField.string(...)`), consumed via `astro:env/server`/`astro:env/client` — never `process.env` in app code.
- `IMAGOR_HOST` and `IMAGOR_SECRET` are both `context: "server"` — signing only happens server/build-side, the secret must never reach the client bundle.
- Signing: HMAC-**SHA256**, digest encoded via Node's `digest("base64url")` (URL-safe, unpadded — matches Imagor's `IMAGOR_SIGNER_TYPE=sha256`), truncated to the first **40** characters _after_ encoding (matches `IMAGOR_SIGNER_TRUNCATE=40`).
- The upstream image URL **must** be `encodeURIComponent()`-encoded before being embedded in the signed path (confirmed required by the project owner — omitting this caused prior issues with this Imagor deployment).
- Crop mode is always `fit-in` (never smart-crop) — full image content is preserved, matching current no-cropping behavior.
- `image.domains` in `astro.config.mjs` (`upload.wikimedia.org`, `cms.berliner-schnauze.wtf`, `m.media-amazon.com`) stays unchanged and continues to gate which remote `src` values Astro accepts before the image service ever sees them.
- Existing components (`ImageGallery.astro`, `ArticleImage.astro`, `BookRecommendations.astro`, `WordGalleryCol.astro`) must not be modified — they keep calling `Picture`/`getImage` with the same props.
- Test file naming/location follows existing convention: `src/tests/unit/<mirrored-path>/<name>.test.ts`, using Vitest (`describe`/`it`/`expect`/`vi`).
- Commit messages: `<type>(<scope>): <description>`, imperative, lowercase, no trailing period (see `CLAUDE.md` Git Commit Conventions). Use scope `search`... no — use no scope or a new scope is fine if none of the listed ones fit; for this feature use `build` or no scope, imperative description.

---

## Task 1: Imagor signing utility

**Files:**

- Create: `src/utils/imagor.ts`
- Test: `src/tests/unit/utils/imagor.test.ts`

**Interfaces:**

- Consumes: `astro:env/server` exports `IMAGOR_HOST: string`, `IMAGOR_SECRET: string` (added to `astro.config.mjs` in Task 3 — for this task's tests, mock the module).
- Produces:
  - `buildImagorPath(upstreamUrl: string, options: { width: number; height: number; format?: string; quality?: number }): string`
  - `signImagorPath(path: string): string`

Both are pure functions with no side effects beyond reading the two env vars.

- [ ] **Step 1: Write the failing tests**

Create `src/tests/unit/utils/imagor.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("astro:env/server", () => ({
  IMAGOR_HOST: "https://assets.kasimir.dev",
  IMAGOR_SECRET: "1234",
}));

const { buildImagorPath, signImagorPath } = await import("@utils/imagor");

describe("buildImagorPath", () => {
  it("builds a fit-in path with format, quality, and an encoded upstream URL", () => {
    const path = buildImagorPath("https://cms.berliner-schnauze.wtf/wp-content/uploads/foo.png", {
      width: 400,
      height: 200,
      format: "webp",
      quality: 80,
    });

    expect(path).toBe(
      "fit-in/400x200/filters:format(webp):quality(80)/https%3A%2F%2Fcms.berliner-schnauze.wtf%2Fwp-content%2Fuploads%2Ffoo.png",
    );
  });

  it("defaults quality to 80 and format to webp when omitted", () => {
    const path = buildImagorPath("https://upload.wikimedia.org/x.jpg", {
      width: 100,
      height: 50,
    });

    expect(path).toBe(
      "fit-in/100x50/filters:format(webp):quality(80)/https%3A%2F%2Fupload.wikimedia.org%2Fx.jpg",
    );
  });
});

describe("signImagorPath", () => {
  it("matches Imagor's own reference test vector (cshum/imagor imagorpath/params_test.go, SHA256 signer)", () => {
    // Reference vector: secret "1234", HMAC-SHA256, base64url, truncated to 40 chars.
    const path = "meta/10x11:12x13/fit-in/-300x-200/5x6/left/top/smart/filters:some_filter()/img";

    const signed = signImagorPath(path);

    expect(signed).toBe(
      "https://assets.kasimir.dev/XBCO7esuLsNQuSF2v9ie36pESRGx2rzLjhUxXWnV/meta/10x11:12x13/fit-in/-300x-200/5x6/left/top/smart/filters:some_filter()/img",
    );
  });

  it("is deterministic for the same input", () => {
    expect(signImagorPath("fit-in/1x1/x")).toBe(signImagorPath("fit-in/1x1/x"));
  });

  it("produces a different hash when the path changes", () => {
    expect(signImagorPath("fit-in/1x1/a")).not.toBe(signImagorPath("fit-in/1x1/b"));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/tests/unit/utils/imagor.test.ts`
Expected: FAIL — `Cannot find module '@utils/imagor'` (file doesn't exist yet).

- [ ] **Step 3: Implement `src/utils/imagor.ts`**

```ts
import { createHmac } from "node:crypto";
import { IMAGOR_HOST, IMAGOR_SECRET } from "astro:env/server";

const SIGNER_TRUNCATE = 40;

interface ImagorTransform {
  width: number;
  height: number;
  format?: string;
  quality?: number;
}

export function buildImagorPath(
  upstreamUrl: string,
  { width, height, format, quality }: ImagorTransform,
): string {
  const targetFormat = format ?? "webp";
  const targetQuality = quality ?? 80;
  return `fit-in/${width}x${height}/filters:format(${targetFormat}):quality(${targetQuality})/${encodeURIComponent(upstreamUrl)}`;
}

export function signImagorPath(path: string): string {
  const hash = createHmac("sha256", IMAGOR_SECRET)
    .update(path)
    .digest("base64url")
    .slice(0, SIGNER_TRUNCATE);
  return `${IMAGOR_HOST}/${hash}/${path}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/tests/unit/utils/imagor.test.ts`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/imagor.ts src/tests/unit/utils/imagor.test.ts
git commit -m "feat(images): add Imagor HMAC-SHA256 URL signing utility"
```

---

## Task 2: Custom Imagor Image Service

**Files:**

- Create: `src/lib/imagorImageService.ts`
- Test: `src/tests/unit/lib/imagorImageService.test.ts`

**Interfaces:**

- Consumes: `buildImagorPath`, `signImagorPath` from `@utils/imagor` (Task 1). `baseService` from `astro/assets` (Astro built-in, exports `validateOptions`, `getSrcSet`, `getHTMLAttributes`, `getURL`, `parseURL`, `getRemoteSize`).
- Produces: default export `imagorImageService: ExternalImageService` — consumed by `astro.config.mjs`'s `image.service.entrypoint` in Task 3.

- [ ] **Step 1: Write the failing tests**

Create `src/tests/unit/lib/imagorImageService.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

const buildImagorPathMock = vi.fn(
  () => "fit-in/400x200/filters:format(webp):quality(80)/encoded-url",
);
const signImagorPathMock = vi.fn(
  (path: string) => `https://assets.kasimir.dev/signed-hash/${path}`,
);

vi.mock("@utils/imagor", () => ({
  buildImagorPath: buildImagorPathMock,
  signImagorPath: signImagorPathMock,
}));

const { default: imagorImageService } = await import("@lib/imagorImageService");

describe("imagorImageService.getURL", () => {
  it("builds and signs a path for a remote string src with width/height", () => {
    const url = imagorImageService.getURL(
      {
        src: "https://cms.berliner-schnauze.wtf/foo.png",
        width: 400,
        height: 200,
        format: "webp",
        quality: 80,
      },
      {} as never,
    );

    expect(buildImagorPathMock).toHaveBeenCalledWith("https://cms.berliner-schnauze.wtf/foo.png", {
      width: 400,
      height: 200,
      format: "webp",
      quality: 80,
    });
    expect(signImagorPathMock).toHaveBeenCalledWith(
      "fit-in/400x200/filters:format(webp):quality(80)/encoded-url",
    );
    expect(url).toBe(
      "https://assets.kasimir.dev/signed-hash/fit-in/400x200/filters:format(webp):quality(80)/encoded-url",
    );
  });

  it("throws when width is missing", () => {
    expect(() =>
      imagorImageService.getURL(
        { src: "https://cms.berliner-schnauze.wtf/foo.png", height: 200 },
        {} as never,
      ),
    ).toThrow(/width and height/);
  });

  it("throws when height is missing", () => {
    expect(() =>
      imagorImageService.getURL(
        { src: "https://cms.berliner-schnauze.wtf/foo.png", width: 400 },
        {} as never,
      ),
    ).toThrow(/width and height/);
  });

  it("throws for non-string (ESM-imported) src", () => {
    expect(() =>
      imagorImageService.getURL(
        { src: { src: "/local.png" } as never, width: 400, height: 200 },
        {} as never,
      ),
    ).toThrow(/remote/);
  });
});

describe("imagorImageService transform-shape hooks", () => {
  it("delegates validateOptions, getSrcSet, and getHTMLAttributes to Astro's baseService", async () => {
    const { baseService } = await import("astro/assets");

    expect(imagorImageService.validateOptions).toBe(baseService.validateOptions);
    expect(imagorImageService.getSrcSet).toBe(baseService.getSrcSet);
    expect(imagorImageService.getHTMLAttributes).toBe(baseService.getHTMLAttributes);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/tests/unit/lib/imagorImageService.test.ts`
Expected: FAIL — `Cannot find module '@lib/imagorImageService'`.

- [ ] **Step 3: Implement `src/lib/imagorImageService.ts`**

```ts
import { baseService } from "astro/assets";
import type { ExternalImageService, ImageTransform } from "astro";
import { buildImagorPath, signImagorPath } from "@utils/imagor";

const imagorImageService: ExternalImageService = {
  validateOptions: baseService.validateOptions,
  getSrcSet: baseService.getSrcSet,
  getHTMLAttributes: baseService.getHTMLAttributes,
  getURL(options: ImageTransform) {
    if (typeof options.src !== "string") {
      throw new Error("imagorImageService only supports remote (string) image sources.");
    }
    if (!options.width || !options.height) {
      throw new Error(`imagorImageService requires both width and height, got src=${options.src}`);
    }
    const path = buildImagorPath(options.src, {
      width: options.width,
      height: options.height,
      format: options.format,
      quality: typeof options.quality === "number" ? options.quality : undefined,
    });
    return signImagorPath(path);
  },
};

export default imagorImageService;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/tests/unit/lib/imagorImageService.test.ts`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/imagorImageService.ts src/tests/unit/lib/imagorImageService.test.ts
git commit -m "feat(images): add custom Astro image service backed by Imagor"
```

---

## Task 3: Wire Imagor into astro.config.mjs

**Files:**

- Modify: `astro.config.mjs:108-112` (image config), `astro.config.mjs:113-233` (env schema), `astro.config.mjs:338-383` (PWA `runtimeCaching`)

**Interfaces:**

- Consumes: `src/lib/imagorImageService.ts` default export (Task 2); `astro:env` schema pattern already established (`envField.string`).
- Produces: `IMAGOR_HOST`/`IMAGOR_SECRET` available via `astro:env/server` project-wide; `image.service.entrypoint` pointing at the Imagor service; a Workbox `runtimeCaching` entry for `assets.kasimir.dev`.

This task has no unit-testable application logic of its own (it's declarative Astro/Vite config) — verification is a real build plus inspecting the generated service worker, per the project's PWA testing convention (there is no existing automated test for `runtimeCaching` entries either).

- [ ] **Step 1: Add `IMAGOR_HOST`/`IMAGOR_SECRET` to the env schema**

In `astro.config.mjs`, inside `env.schema` (after the `WAKAPI_API_KEY` entry, `astro.config.mjs:142`), add:

```js
IMAGOR_HOST: envField.string({
  context: "server",
  access: "public",
}),
IMAGOR_SECRET: envField.string({
  context: "server",
  access: "secret",
}),
```

- [ ] **Step 2: Point `image.service` at the Imagor service**

In `astro.config.mjs`, change the `image` block (`astro.config.mjs:108-112`) from:

```js
image: {
  domains: ["upload.wikimedia.org", "cms.berliner-schnauze.wtf", "m.media-amazon.com"],
  breakpoints: [180, 320, 480, 640, 750, 828, 960, 1080, 1280, 1668, 1920, 2048, 2560],
  responsiveStyles: true,
},
```

to:

```js
image: {
  domains: ["upload.wikimedia.org", "cms.berliner-schnauze.wtf", "m.media-amazon.com"],
  breakpoints: [180, 320, 480, 640, 750, 828, 960, 1080, 1280, 1668, 1920, 2048, 2560],
  responsiveStyles: true,
  service: {
    entrypoint: "./src/lib/imagorImageService.ts",
  },
},
```

- [ ] **Step 3: Add a Workbox `runtimeCaching` entry for Imagor images**

In `astro.config.mjs`, inside the PWA `workbox.runtimeCaching` array (`astro.config.mjs:338-383`), after the `api-word-of-the-day` entry, add:

```js
{
  urlPattern: /^https:\/\/assets\.kasimir\.dev\/.*/,
  handler: "CacheFirst",
  options: {
    cacheName: "imagor-images",
    expiration: {
      maxEntries: 200,
      maxAgeSeconds: 2_592_000, // 30 days
    },
    cacheableResponse: {
      statuses: [0, 200],
    },
  },
},
```

- [ ] **Step 4: Set `IMAGOR_HOST`/`IMAGOR_SECRET` in Infisical-backed local env**

Confirm with `npx infisical secrets --env=dev | grep IMAGOR` that `IMAGOR_HOST` (`https://assets.kasimir.dev`) and `IMAGOR_SECRET` are present in the Infisical project (per the task description, `IMAGOR_SECRET` already exists in the secret manager). No local `.env` edits needed — `pnpm dev`/`pnpm gql:generate` already wrap commands with `infisical run --`.

- [ ] **Step 5: Typecheck the config and service**

Run: `pnpm astro check` (or `pnpm typechecking` for the full check)
Expected: no new type errors referencing `astro.config.mjs`, `src/lib/imagorImageService.ts`, or `src/utils/imagor.ts`.

- [ ] **Step 6: Full local build and manual verification**

Run: `pnpm build:local`
Expected: build succeeds. Then inspect one generated word page's HTML output for an `<img src="https://assets.kasimir.dev/...">` (or the built `dist/sw.js`) to confirm:

- Image `src` attributes point at `assets.kasimir.dev` with a signed (non-`unsafe`) hash segment.
- `dist/sw.js` contains a runtime-caching registration referencing `assets.kasimir.dev` (cache name `imagor-images`).

```bash
grep -o 'https://assets\.kasimir\.dev/[^"]*' dist/wort/*/index.html | head -3
grep -o "assets\\\\.kasimir\\\\.dev" dist/sw.js
```

- [ ] **Step 7: Run the full unit test suite**

Run: `pnpm test:unit`
Expected: PASS — no regressions in existing tests (image-related tests mock `astro:env/client`/`astro:env/server` already, per existing convention; no test suite exercises `astro:assets` directly today, so no pre-existing tests are expected to touch the new service).

- [ ] **Step 8: Commit**

```bash
git add astro.config.mjs
git commit -m "feat(images): wire Imagor service into Astro image pipeline and PWA cache"
```

---

## Post-Plan Note

Set `IMAGOR_HOST` and `IMAGOR_SECRET` in the Cloudflare Pages dashboard's environment variables for production builds (per `CLAUDE.md` "Secrets" section: CF Pages builds don't use Infisical, env vars are configured separately there) before merging/deploying — otherwise the production build will fail `astro:env` schema validation (both fields are required, non-optional).
