const QUERY = `
  query($after: String) {
    berlinerWords(first: 100, after: $after, where: { stati: PUBLISH }) {
      edges { node { slug modifiedGmt } }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

async function fetchAll(apiUrl: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let cursor: string | null = null;

  do {
    const res = await fetch(apiUrl, {
      body: JSON.stringify({ query: QUERY, variables: { after: cursor } }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const { data } = (await res.json()) as {
      data?: {
        berlinerWords?: {
          edges: { node: { slug: string; modifiedGmt: string } }[];
          pageInfo: { endCursor: string; hasNextPage: boolean };
        };
      };
    };
    const bw = data?.berlinerWords;
    if (!bw) break;

    for (const { node } of bw.edges) {
      if (node.slug && node.modifiedGmt) {
        map.set(node.slug, new Date(node.modifiedGmt + "Z").toISOString());
      }
    }
    cursor = bw.pageInfo.hasNextPage ? bw.pageInfo.endCursor : null;
  } while (cursor);

  return map;
}

let _cache: Promise<Map<string, string>> | null = null;

/** Returns slug → ISO lastmod date for all published words. Cached per build process.
 *  Uses process.env.WP_API directly — safe to import from astro.config.mjs. */
export const getWordDates = (): Promise<Map<string, string>> => {
  const apiUrl = process.env.WP_API;
  if (!apiUrl) return Promise.resolve(new Map());
  _cache ??= fetchAll(apiUrl);
  return _cache;
};
