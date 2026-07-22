/** Sitemap route filter: drop settings pages and the BON share route,
 *  keep everything else (words, magazine, themen, static pages). */
export const sitemapFilter = (page: string): boolean =>
  !page.includes("/settings") &&
  !page.endsWith("/games/berliner-oder-nicht/share");

type DateNode = { slug: string; modifiedGmt: string };

const buildQuery = (root: string, where: string): string => `
  query($after: String) {
    ${root}(first: 100, after: $after, where: { ${where} }) {
      edges { node { slug modifiedGmt } }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

/** Paginates a WPGraphQL connection, returning slug → ISO lastmod. */
async function fetchDates(
  apiUrl: string,
  query: string,
  root: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let cursor: string | null = null;

  const { WP_AUTH_PASS, WP_AUTH_USER } = process.env;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (WP_AUTH_USER && WP_AUTH_PASS) {
    headers.Authorization = `Basic ${Buffer.from(`${WP_AUTH_USER}:${WP_AUTH_PASS}`).toString("base64")}`;
  }

  do {
    const res = await fetch(apiUrl, {
      body: JSON.stringify({ query, variables: { after: cursor } }),
      headers,
      method: "POST",
    });
    const { data } = (await res.json()) as {
      data?: Record<
        string,
        {
          edges: { node: DateNode }[];
          pageInfo: { endCursor: string; hasNextPage: boolean };
        }
      >;
    };
    const conn = data?.[root];
    if (!conn) break;

    for (const { node } of conn.edges) {
      if (node.slug && node.modifiedGmt) {
        map.set(node.slug, new Date(node.modifiedGmt + "Z").toISOString());
      }
    }
    cursor = conn.pageInfo.hasNextPage ? conn.pageInfo.endCursor : null;
  } while (cursor);

  return map;
}

const WORD_QUERY = buildQuery("berlinerWords", "stati: PUBLISH");
const POST_QUERY = buildQuery("posts", "status: PUBLISH");

let _wordCache: Promise<Map<string, string>> | null = null;
let _postCache: Promise<Map<string, string>> | null = null;

/** Returns slug → ISO lastmod for all published words. Cached per build process.
 *  Uses process.env.WP_API directly — safe to import from astro.config.mjs. */
export const getWordDates = (): Promise<Map<string, string>> => {
  const apiUrl = process.env.WP_API;
  if (!apiUrl) return Promise.resolve(new Map());
  _wordCache ??= fetchDates(apiUrl, WORD_QUERY, "berlinerWords");
  return _wordCache;
};

/** Returns slug → ISO lastmod for all published magazine posts. Cached per build. */
export const getPostDates = (): Promise<Map<string, string>> => {
  const apiUrl = process.env.WP_API;
  if (!apiUrl) return Promise.resolve(new Map());
  _postCache ??= fetchDates(apiUrl, POST_QUERY, "posts");
  return _postCache;
};
