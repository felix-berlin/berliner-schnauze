// Applies the Cloudflare-style public/_headers + public/_redirects files, so
// they stay the single source of truth now that the site runs on Node.

/** `_headers`: a path pattern line (`/*`, `/_astro/*`, `/exact`), then indented `Key: value` lines. */
export const parseHeaders = (text) => {
  const rules = [];
  for (const line of text.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      rules.push({ headers: [], pattern: line.trim() });
      continue;
    }
    const sep = line.indexOf(":");
    const key = line.slice(0, sep).trim();
    // The adapter sets Cache-Control itself for /_astro/* — on 2xx only, so a 404
    // never gets cached as immutable. Setting it up front would undo that.
    if (key.toLowerCase() === "cache-control") continue;
    rules.at(-1)?.headers.push([key, line.slice(sep + 1).trim()]);
  }
  return rules;
};

export const matchHeaders = (rules, pathname) =>
  rules
    .filter(({ pattern }) =>
      pattern.endsWith("*") ? pathname.startsWith(pattern.slice(0, -1)) : pathname === pattern,
    )
    .flatMap(({ headers }) => headers);

/** `_redirects`: `from to [status]` per line, exact paths only. */
export const parseRedirects = (text) =>
  new Map(
    text
      .split("\n")
      .map((line) => line.trim().split(/\s+/))
      .filter(([from]) => from && !from.startsWith("#"))
      .map(([from, to, status = "302"]) => [from, { status: Number(status), to }]),
  );
