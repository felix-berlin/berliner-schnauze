# Magazin (Blog) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display the 13 existing native-WordPress draft posts (and any future ones) under `/magazin/` as a listing + detail page, rendering their Gutenberg blocks safely — with a guaranteed fallback for any block type the code doesn't explicitly know about.

**Architecture:** New GraphQL query (`getPosts.ts`, mirrors the existing `getThemen.ts` cached-promise pattern) feeds two new Astro pages (`magazin/index.astro`, `magazin/[postSlug].astro`, mirroring `themen/index.astro` / `themen/[themaSlug].astro`). A dedicated Astro block-dispatcher component (`ArticleBlocks.astro`) renders each Gutenberg block: `core/image` and `core/quote` get real components because this schema exposes extra typed data for them; every other block type (including unknown/future ones) falls back to the WordPress-rendered `saveContent` HTML.

**Tech Stack:** Astro (SSG pages + components), `@urql/core` GraphQL client, `graphql-codegen` client preset, `astro:assets` `<Picture>`, Vitest + `AstroContainer`.

**Reference spec:** `docs/superpowers/specs/2026-07-15-magazin-blog-design.md`

## Global Constraints

- Package manager: `pnpm` only (never `npm`/`yarn`)
- Import aliases only — never relative paths (`@components/*`, `@services/*`, `@styles/*`, `@/*`)
- CSS: BEMIT naming (`.c-`, `.o-`, `.u-`, `.is-`/`.has-`, `.js-`), SCSS via `@use`, styles NOT scoped in Vue but here we're in Astro — SCSS files imported in the page/component frontmatter (Astro convention, see `themen/index.astro`)
- GraphQL query failures must throw, never swallow (established in PR #1672 for `getThemen`/`getMenu`/`getCompanyFunding`)
- `where: { status: PUBLISH }` is mandatory in the posts query — the WPGraphQL client is authenticated and would otherwise also return DRAFT posts
- No new npm dependencies — everything needed (`@urql/core`, `astro:assets`, `graphql-codegen`) is already in the project
- Codegen (`pnpm gql:generate`) requires `infisical login` to have been run once, per project docs

---

### Task 1: Post query + data fetching

**Files:**
- Create: `src/services/fragments/blockFragments.ts`
- Create: `src/services/queries/getPosts.ts`
- Modify: `src/services/api.ts`
- Test: `src/tests/unit/services/getPosts.test.ts`

**Interfaces:**
- Produces: `fetchAllPosts(): Promise<PostNodes>` — cached promise, throws on GraphQL error, evicts cache on failure so the next call retries (same contract as `fetchAllThemen()` in `getThemen.ts`)
- Produces: `GetAllPosts` — the `graphql()`-tagged query document (unused directly outside this file, but exported the same way `GetAllBerlinerischThemen` is)
- Produces (type, available after codegen in Step 6): `PostNodes = NonNullable<GetAllPostsQuery["posts"]>["nodes"]`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/services/getPosts.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("astro:env/client", () => ({ WP_API: "http://test.local/graphql" }));
vi.mock("astro:env/server", () => ({ WP_AUTH_PASS: "test", WP_AUTH_USER: "test" }));

const toPromiseMock = vi.fn();
const queryMock = vi.fn(() => ({ toPromise: toPromiseMock }));

vi.mock("@urql/core", () => ({
  cacheExchange: {},
  Client: vi.fn().mockImplementation(function (this: { query: typeof queryMock }) {
    this.query = queryMock;
  }),
  fetchExchange: {},
}));

beforeEach(() => {
  vi.resetModules();
  toPromiseMock.mockReset();
  queryMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchAllPosts", () => {
  it("returns post nodes on success", async () => {
    toPromiseMock.mockResolvedValue({
      data: { posts: { nodes: [{ slug: "test-post", title: "Test Post" }] } },
      error: undefined,
    });
    const { fetchAllPosts } = await import("@services/queries/getPosts");
    const result = await fetchAllPosts();
    expect(result).toEqual([{ slug: "test-post", title: "Test Post" }]);
  });

  it("returns empty array when nodes are missing", async () => {
    toPromiseMock.mockResolvedValue({ data: { posts: null }, error: undefined });
    const { fetchAllPosts } = await import("@services/queries/getPosts");
    expect(await fetchAllPosts()).toEqual([]);
  });

  it("caches result — second call does not refetch", async () => {
    toPromiseMock.mockResolvedValue({ data: { posts: { nodes: [] } }, error: undefined });
    const { fetchAllPosts } = await import("@services/queries/getPosts");
    await fetchAllPosts();
    await fetchAllPosts();
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("rejects on GraphQL error and evicts the cache so the next call retries", async () => {
    const gqlError = new Error("GraphQL boom");
    toPromiseMock
      .mockResolvedValueOnce({ data: undefined, error: gqlError })
      .mockResolvedValueOnce({
        data: { posts: { nodes: [{ slug: "retry-post", title: "Retry Post" }] } },
        error: undefined,
      });
    const { fetchAllPosts } = await import("@services/queries/getPosts");

    await expect(fetchAllPosts()).rejects.toThrow("GraphQL boom");

    const result = await fetchAllPosts();
    expect(result).toEqual([{ slug: "retry-post", title: "Retry Post" }]);
    expect(queryMock).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/tests/unit/services/getPosts.test.ts`
Expected: FAIL — `Cannot find module '@services/queries/getPosts'` (the file doesn't exist yet)

- [ ] **Step 3: Create the block fragments**

Create `src/services/fragments/blockFragments.ts`:

```ts
import { graphql } from "@/gql";

export const CoreImageBlockFields = graphql(`
  fragment CoreImageBlockFields on CoreImageBlock {
    name
    order
    saveContent
    attributes {
      ... on CoreImageBlockAttributes {
        url
        width
        height
        alt
      }
    }
  }
`);

export const CoreQuoteBlockFields = graphql(`
  fragment CoreQuoteBlockFields on CoreQuoteBlock {
    name
    order
    saveContent
    attributes {
      ... on CoreQuoteBlockAttributes {
        value
      }
    }
  }
`);
```

- [ ] **Step 4: Create the query and fetch function**

Create `src/services/queries/getPosts.ts`:

```ts
import { graphql } from "@/gql";
import type { GetAllPostsQuery } from "@/gql/graphql";
import { wpGraphqlClient } from "@services/wpGraphqlClient";

export type PostNodes = NonNullable<GetAllPostsQuery["posts"]>["nodes"];

export const GetAllPosts = graphql(`
  query GetAllPosts {
    posts(first: 100, where: { status: PUBLISH }) {
      nodes {
        id
        slug
        title
        date
        excerpt(format: RENDERED)
        featuredImage {
          node {
            sourceUrl
            altText
            mediaDetails {
              height
              width
            }
          }
        }
        blocks {
          name
          order
          saveContent
          ...CoreImageBlockFields
          ...CoreQuoteBlockFields
        }
        seo {
          ...PostTypeSeoFragment
        }
      }
    }
  }
`);

let _postsCache: Promise<PostNodes> | null = null;

export const fetchAllPosts = async () => {
  _postsCache ??= wpGraphqlClient
    .query(GetAllPosts, {})
    .toPromise()
    .then((result) => {
      if (result.error) throw result.error;
      return result.data?.posts?.nodes ?? [];
    })
    .catch((err: unknown) => {
      _postsCache = null;
      throw err;
    });
  return _postsCache;
};
```

Note: `GetAllPostsQuery` doesn't exist yet in `@/gql/graphql` — that's expected until Step 6 (codegen). Vitest transpiles without type-checking, so the test in Step 1 already passes without codegen; `pnpm typechecking` will only go green after Step 6.

- [ ] **Step 5: Add the re-export**

Modify `src/services/api.ts` — add one line:

```ts
export * from "@services/queries/getAffiliate";
export * from "@services/queries/getPage";
export * from "@services/queries/getWords";
export * from "@services/queries/getThemen";
export * from "@services/queries/getPosts";
```

- [ ] **Step 6: Regenerate GraphQL types**

Run: `infisical run -- pnpm gql:generate` (requires `infisical login` once beforehand)
Expected: `src/gql/graphql.ts` now contains `GetAllPostsQuery`, `Post`, `Block`, `CoreImageBlock`, `CoreQuoteBlock` and related types. If this fails with an auth error, run `npx infisical login` first.

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm vitest run src/tests/unit/services/getPosts.test.ts`
Expected: PASS (4/4)

- [ ] **Step 8: Commit**

```bash
git add src/services/fragments/blockFragments.ts src/services/queries/getPosts.ts src/services/api.ts src/gql src/tests/unit/services/getPosts.test.ts
git commit -m "feat(magazin): add GetAllPosts query with cached fetchAllPosts()"
```

---

### Task 2: Block renderer components

**Files:**
- Create: `src/components/magazin/ArticleImage.astro`
- Create: `src/components/magazin/ArticleQuote.astro`
- Create: `src/components/magazin/ArticleBlocks.astro`
- Test: `src/tests/unit/components/magazin/ArticleBlocks.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 directly (block shape is described with a local minimal interface, not the generated union type, to keep this component decoupled from the exact GraphQL union shape)
- Produces: `ArticleBlocks` (default export, `.astro`) — `Props: { blocks: ArticleBlock[] }` where `ArticleBlock = { name: string; order: number; saveContent?: string | null; attributes?: unknown }`. Task 4 renders `<ArticleBlocks blocks={post.blocks} />`.

Note on scope: `<Picture>` from `astro:assets` fetches and transforms the real remote image at render time (that's the whole point of the optimization). That must not happen inside a hermetic unit test, so the automated test below covers the dispatch logic and the safe null-guard branch of `ArticleImage`, not the actual optimized `<Picture>` output — that's covered by the manual verification in Task 5.

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/components/magazin/ArticleBlocks.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";
import { createAstroRender } from "../../helpers";

describe("ArticleBlocks.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: ArticleBlocks } = await import("@components/magazin/ArticleBlocks.astro");
    render = await createAstroRender(ArticleBlocks);
  }, 30_000);

  it("passes a paragraph block through via the saveContent fallback", async () => {
    const result = await render({
      blocks: [{ name: "core/paragraph", order: 0, saveContent: "<p>Icke bin Berliner.</p>" }],
    });
    expect(result).toContain("<p>Icke bin Berliner.</p>");
  });

  it("passes an unknown/future block type through via the saveContent fallback", async () => {
    const result = await render({
      blocks: [
        { name: "core/some-future-block", order: 0, saveContent: "<div>Future content</div>" },
      ],
    });
    expect(result).toContain("<div>Future content</div>");
  });

  it("renders blocks in ascending order regardless of input order", async () => {
    const result = await render({
      blocks: [
        { name: "core/paragraph", order: 1, saveContent: "<p>Zweiter</p>" },
        { name: "core/paragraph", order: 0, saveContent: "<p>Erster</p>" },
      ],
    });
    expect(result.indexOf("Erster")).toBeLessThan(result.indexOf("Zweiter"));
  });

  it("renders a core/quote block using the typed quote value", async () => {
    const result = await render({
      blocks: [
        {
          name: "core/quote",
          order: 0,
          saveContent: "<blockquote><p>Icke, icke, icke!</p></blockquote>",
          attributes: { value: "<p>Icke, icke, icke!</p>" },
        },
      ],
    });
    expect(result).toContain("c-magazin-article__quote");
    expect(result).toContain("Icke, icke, icke!");
  });

  it("renders nothing for a core/image block without a url", async () => {
    const result = await render({
      blocks: [{ name: "core/image", order: 0, saveContent: "", attributes: {} }],
    });
    expect(result).not.toContain("c-magazin-article__image");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/tests/unit/components/magazin/ArticleBlocks.test.ts`
Expected: FAIL — `Cannot find module '@components/magazin/ArticleBlocks.astro'`

- [ ] **Step 3: Create `ArticleImage.astro`**

Create `src/components/magazin/ArticleImage.astro`:

```astro
---
import { Picture } from 'astro:assets';

interface ImageBlockAttributes {
  url?: string | null;
  width?: string | null;
  height?: string | null;
  alt?: string | null;
}

interface Props {
  block: {
    attributes?: ImageBlockAttributes | null;
  };
}

const { block } = Astro.props as Props;
const attrs = block.attributes;
---

{attrs?.url && (
  <Picture
    alt={attrs.alt ?? ''}
    class='c-magazin-article__image'
    densities={[1, 2]}
    formats={['avif', 'webp']}
    height={Number(attrs.height) || 400}
    loading='lazy'
    src={attrs.url}
    width={Number(attrs.width) || 800}
  />
)}
```

- [ ] **Step 4: Create `ArticleQuote.astro`**

Create `src/components/magazin/ArticleQuote.astro`:

```astro
---
interface QuoteBlockAttributes {
  value?: string | null;
}

interface Props {
  block: {
    attributes?: QuoteBlockAttributes | null;
  };
}

const { block } = Astro.props as Props;
const value = block.attributes?.value ?? '';
---

<blockquote class='c-magazin-article__quote' set:html={value} />
```

- [ ] **Step 5: Create `ArticleBlocks.astro`**

Create `src/components/magazin/ArticleBlocks.astro`:

```astro
---
import ArticleImage from './ArticleImage.astro';
import ArticleQuote from './ArticleQuote.astro';

interface ArticleBlock {
  name: string;
  order: number;
  saveContent?: string | null;
  attributes?: unknown;
}

interface Props {
  blocks: ArticleBlock[];
}

const { blocks } = Astro.props as Props;
const sorted = [...blocks].sort((a, b) => a.order - b.order);
---

<div class='c-magazin-article__body'>
  {sorted.map((block) => {
    if (block.name === 'core/image') return <ArticleImage block={block} />;
    if (block.name === 'core/quote') return <ArticleQuote block={block} />;
    return <Fragment set:html={block.saveContent ?? ''} />;
  })}
</div>
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm vitest run src/tests/unit/components/magazin/ArticleBlocks.test.ts`
Expected: PASS (5/5)

- [ ] **Step 7: Commit**

```bash
git add src/components/magazin/ArticleImage.astro src/components/magazin/ArticleQuote.astro src/components/magazin/ArticleBlocks.astro src/tests/unit/components/magazin/ArticleBlocks.test.ts
git commit -m "feat(magazin): add block-by-block article renderer with saveContent fallback"
```

---

### Task 3: Magazin listing page

**Files:**
- Create: `src/pages/magazin/index.astro`
- Create: `src/styles/components/_magazin-overview.scss`

**Interfaces:**
- Consumes: `fetchAllPosts()` from Task 1 (`@services/api`)

No dedicated test file — thin routing/listing page, consistent with `themen/index.astro` (no test either). Verified in Task 5's manual check.

- [ ] **Step 1: Create the stylesheet**

Create `src/styles/components/_magazin-overview.scss`:

```scss
@use "@styles/variables" as vars;

.c-magazin-overview {
  padding-block: vars.$spacer * 3;

  &__title {
    margin-block-end: vars.$spacer * 0.5;
  }

  &__intro {
    max-width: 60ch;
    margin-block-end: vars.$spacer * 1.5;
    font-size: 1rem;
    line-height: 1.6;
  }

  &__list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: vars.$spacer;
  }

  &__item {
    display: flex;
    flex-direction: column;
    gap: vars.$spacer * 0.5;
    padding: vars.$spacer;
    border: 1px dashed var(--grey-100);
  }

  &__image {
    border-radius: 4px;
  }

  &__link {
    font-weight: 600;
    font-size: 1.125rem;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  &__excerpt {
    font-size: 0.9375rem;
    line-height: 1.5;
    opacity: 0.85;
  }

  &__date {
    font-size: 0.875rem;
    opacity: 0.7;
  }
}
```

- [ ] **Step 2: Create the page**

Create `src/pages/magazin/index.astro`:

```astro
---
import Layout from '@layouts/Layout.astro';
import { fetchAllPosts } from '@services/api.ts';
import { canonicalUrl, seoData } from '@utils/helpers.ts';
import { Breadcrumbs } from 'astro-breadcrumbs';
import ChevronRight from '~icons/lucide/chevron-right';
import { Picture } from 'astro:assets';

import '@styles/plugins/astro-breadcrumbs.scss';
import '@styles/components/_magazin-overview.scss';

const allPosts = await fetchAllPosts();
const sortedPosts = [...allPosts].sort(
  (a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime(),
);

const content = {
  seo: {
    canonical: canonicalUrl('/magazin', Astro.site),
    opengraphDescription:
      'Geschichte, Herkunft und Kuriositäten der Berliner Schnauze – Wissensartikel rund um den Berliner Dialekt.',
    opengraphType: 'website',
  },
  title: 'Magazin – Wissen rund um die Berliner Schnauze',
};

const itemListJson = () =>
  JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: sortedPosts.map((post, index) => ({
      '@type': 'ListItem',
      name: post.title ?? '',
      position: index + 1,
      url: canonicalUrl(`/magazin/${post.slug}`, Astro.site),
    })),
    name: 'Magazin',
    numberOfItems: sortedPosts.length,
  });
---

<Layout content={seoData(content)}>
  <section class='o-container c-magazin-overview'>
    <Breadcrumbs indexText='Start' linkTextFormat='capitalized'>
      <ChevronRight height='20' slot='separator' width='20' />
    </Breadcrumbs>

    <h1 class='c-magazin-overview__title'>Magazin</h1>
    <p class='c-magazin-overview__intro'>
      Geschichte, Herkunft und Kuriositäten der Berliner Schnauze – von Redewendungen bis
      Berolinismen.
    </p>

    <ul class='c-magazin-overview__list'>
      {
        sortedPosts.map((post) => (
          <li class='c-magazin-overview__item'>
            {post.featuredImage?.node?.sourceUrl && (
              <Picture
                alt={post.featuredImage.node.altText ?? ''}
                class='c-magazin-overview__image'
                formats={['avif', 'webp']}
                height={200}
                loading='lazy'
                src={post.featuredImage.node.sourceUrl}
                width={320}
              />
            )}
            <a class='c-magazin-overview__link' href={`/magazin/${post.slug}`}>
              {post.title}
            </a>
            {post.date && (
              <time class='c-magazin-overview__date' datetime={post.date}>
                {new Date(post.date).toLocaleDateString('de-DE')}
              </time>
            )}
            {post.excerpt && (
              <p class='c-magazin-overview__excerpt' set:html={post.excerpt} />
            )}
          </li>
        ))
      }
    </ul>
  </section>

  <script set:html={itemListJson()} type='application/ld+json' />
</Layout>
```

- [ ] **Step 3: Verify the build compiles**

Run: `pnpm astro check`
Expected: No new errors referencing `src/pages/magazin/index.astro`

- [ ] **Step 4: Commit**

```bash
git add src/pages/magazin/index.astro src/styles/components/_magazin-overview.scss
git commit -m "feat(magazin): add magazine listing page"
```

---

### Task 4: Magazin detail page

**Files:**
- Create: `src/pages/magazin/[postSlug].astro`
- Create: `src/styles/components/_magazin-article.scss`

**Interfaces:**
- Consumes: `fetchAllPosts()` from Task 1, `ArticleBlocks` from Task 2

- [ ] **Step 1: Create the stylesheet**

Create `src/styles/components/_magazin-article.scss`:

```scss
@use "@styles/variables" as vars;

.c-magazin-article {
  &__header {
    padding-block: vars.$spacer * 2 vars.$spacer;
  }

  &__title {
    margin-block-end: vars.$spacer * 0.25;
  }

  &__date {
    font-size: 0.875rem;
    opacity: 0.7;
  }

  &__body {
    max-width: 70ch;

    :is(h2, h3, h4) {
      margin-block: vars.$spacer * 1.5 vars.$spacer * 0.5;
    }

    p {
      line-height: 1.7;
      margin-block-end: vars.$spacer;
    }

    hr {
      border: none;
      border-block-start: 1px dashed var(--grey-100);
      margin-block: vars.$spacer * 2;
    }

    ul,
    ol {
      margin-block-end: vars.$spacer;
      padding-inline-start: vars.$spacer;
    }
  }

  &__quote {
    margin: vars.$spacer * 1.5 0;
    padding: vars.$spacer;
    border: 1px dashed var(--orange-200);
    font-style: italic;

    p {
      margin: 0;
    }
  }

  &__image {
    margin-block: vars.$spacer;
    border-radius: 4px;
  }
}
```

- [ ] **Step 2: Create the page**

Create `src/pages/magazin/[postSlug].astro`:

```astro
---
import '@styles/plugins/astro-breadcrumbs.scss';
import '@styles/components/_magazin-article.scss';

import type { GetStaticPaths, InferGetStaticPropsType } from 'astro';

import Layout from '@layouts/Layout.astro';
import ArticleBlocks from '@components/magazin/ArticleBlocks.astro';
import { fetchAllPosts } from '@services/api.ts';
import { canonicalUrl, seoData } from '@utils/helpers.ts';
import { Breadcrumbs } from 'astro-breadcrumbs';
import ChevronRight from '~icons/lucide/chevron-right';
import { Picture } from 'astro:assets';

export const getStaticPaths = (async () => {
  const allPosts = await fetchAllPosts();

  return allPosts.flatMap((post) => {
    if (!post.slug) return [];
    return [{
      params: { postSlug: post.slug },
      props: { post },
    }];
  });
}) satisfies GetStaticPaths;

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

const { post } = Astro.props as Props;

const seoProps = seoData({
  seo: {
    canonical: post.seo?.canonical ?? canonicalUrl(`/magazin/${post.slug}/`, Astro.site),
    opengraphDescription: post.seo?.opengraphDescription ?? post.seo?.metaDesc ?? '',
    ...(post.seo?.opengraphImage?.sourceUrl && {
      opengraphImage: { sourceUrl: post.seo.opengraphImage.sourceUrl },
    }),
    opengraphType: 'article',
    title: post.seo?.title ?? post.title ?? '',
  },
  title: post.title ?? '',
});

const articleJson = () =>
  JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    datePublished: post.date ?? undefined,
    headline: post.title ?? '',
    url: canonicalUrl(`/magazin/${post.slug}`, Astro.site),
  });
---

<Layout content={seoProps} contentClasses='o-magazin-article'>
  <Breadcrumbs indexText='Start' linkTextFormat='capitalized'>
    <ChevronRight height='20' slot='separator' width='20' />
  </Breadcrumbs>

  <header class='c-magazin-article__header'>
    <h1 class='c-magazin-article__title'>{post.title}</h1>
    {post.date && (
      <time class='c-magazin-article__date' datetime={post.date}>
        {new Date(post.date).toLocaleDateString('de-DE')}
      </time>
    )}
    {post.featuredImage?.node?.sourceUrl && (
      <Picture
        alt={post.featuredImage.node.altText ?? ''}
        class='c-magazin-article__image'
        formats={['avif', 'webp']}
        height={420}
        loading='eager'
        src={post.featuredImage.node.sourceUrl}
        width={800}
      />
    )}
  </header>

  <ArticleBlocks blocks={post.blocks ?? []} />

  <script set:html={articleJson()} type='application/ld+json' />
</Layout>
```

- [ ] **Step 3: Verify the build compiles**

Run: `pnpm astro check`
Expected: No new errors referencing `src/pages/magazin/[postSlug].astro`

- [ ] **Step 4: Commit**

```bash
git add "src/pages/magazin/[postSlug].astro" src/styles/components/_magazin-article.scss
git commit -m "feat(magazin): add magazine article detail page"
```

---

### Task 5: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Temporarily publish one post for local testing**

In WordPress admin, set exactly one of the 13 draft posts (e.g. "Kurioses über das Berlinische") to **Published**. This is required because `GetAllPosts` filters `where: { status: PUBLISH }` — drafts intentionally never reach the frontend.

- [ ] **Step 2: Start the dev server**

Run: `pnpm dev` (requires `infisical login`)
Open `http://localhost:4321/magazin/` — confirm the published post appears as a card with title, excerpt, date, and image (if it has a featured image).

- [ ] **Step 3: Check the detail page**

Click through to `/magazin/<slug>/`. Confirm:
- Headings, paragraphs, and lists render correctly
- Any image blocks render as optimized `<picture>` elements (check DevTools Network tab for `.avif`/`.webp` requests)
- Any quote blocks render inside the dashed-border `c-magazin-article__quote` box
- Toggle dark mode — verify the dashed borders and text remain legible

- [ ] **Step 4: Run the full quality gate**

```bash
pnpm lint
pnpm test:unit
pnpm typechecking
```

Expected: all three pass.

- [ ] **Step 5: Revert the test post to draft**

Set the post back to **Draft** in WordPress admin — the 13 posts stay unpublished until you decide to release them individually, per the spec's non-goal of not batch-publishing as part of this work.

- [ ] **Step 6: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix(magazin): address issues found during manual verification"
```

(Skip this step if no fixes were necessary.)
