// Container entrypoint: wraps the @astrojs/node standalone handler to redirect www and to add the security headers
// to every response, static assets included (plain redirects live in astro.config.mjs `redirects`). Compressing
// dynamic responses is Traefik's job (komodo repo, remote/thrash/traefik); only /_astro/ assets come precompressed.
import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname } from "node:path";
import { promisify } from "node:util";
import { brotliCompress } from "node:zlib";

const CANONICAL_HOST = "berliner-schnauze.wtf";

const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' data: https://challenges.cloudflare.com https://pulse.berliner-schnauze.wtf https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; media-src 'self' https://cms.berliner-schnauze.wtf; img-src 'self' data: https://assets.kasimir.dev https://pulse.berliner-schnauze.wtf; font-src 'self' data:; connect-src 'self' https://assets.kasimir.dev https://challenges.cloudflare.com https://pulse.berliner-schnauze.wtf https://cloudflareinsights.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io; frame-src https://challenges.cloudflare.com; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
};

const ASSETS_DIR = new URL("../dist/client/_astro/", import.meta.url);
const ASSET_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};
// Only names that exist: a request can neither leave the folder nor fill the cache with misses.
const assetNames = new Set(readdirSync(ASSETS_DIR).filter((name) => ASSET_TYPES[extname(name)]));
const brAssets = new Map();
const brotli = promisify(brotliCompress);

/**
 * Hashed build assets never change: compressed once at Brotli's best quality (smaller than Traefik's on-the-fly
 * compression, which passes a response with Content-Encoding through) and kept, ~0.3 MB for all. Undefined for
 * anything else, which takes the normal way.
 */
const brAsset = (pathname) => {
  const name = pathname.slice("/_astro/".length);
  if (!assetNames.has(name)) return undefined;
  if (!brAssets.has(name))
    brAssets.set(
      name,
      readFile(new URL(name, ASSETS_DIR)).then((b) => brotli(b)),
    );
  return brAssets.get(name).then((body) => ({ body, type: ASSET_TYPES[extname(name)] }));
};

process.env.ASTRO_NODE_AUTOSTART = "disabled";
const { handler } = await import("../dist/server/entry.mjs");

const server = createServer((req, res) => {
  // www → canonical host. The target is fixed: a header-derived one would redirect anywhere (Host: www.evil.com).
  const { pathname, search } = new URL(req.url ?? "/", "http://localhost");
  const hosts = [req.headers.host, req.headers["x-forwarded-host"]].map((h) =>
    String(h ?? "")
      .split(",")[0]
      .trim()
      .toLowerCase()
      .replace(/:\d+$/, ""),
  );
  if (hosts.includes(`www.${CANONICAL_HOST}`)) {
    // Drop a trailing slash here too (trailingSlash: "never"), so it takes one hop, not two.
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
    res.writeHead(301, { Location: `https://${CANONICAL_HOST}${path}${search}` }).end();
    return;
  }
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(key, value);
  // @astrojs/node answers 400 when the whole URL fails decodeURI. A malformed query (a mangled share link)
  // is the page's to handle: re-encode it. A malformed path still gets the 400.
  try {
    decodeURI(req.url ?? "/");
  } catch {
    req.url = `${req.url.split("?")[0]}?${new URLSearchParams(search)}`;
  }
  const asset =
    req.method === "GET" &&
    pathname.startsWith("/_astro/") &&
    /\bbr\b/.test(String(req.headers["accept-encoding"] ?? "")) &&
    brAsset(pathname);
  if (asset) {
    asset.then(
      ({ body, type }) =>
        res
          .writeHead(200, {
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Encoding": "br",
            "Content-Length": body.length,
            "Content-Type": type,
            Vary: "Accept-Encoding",
          })
          .end(body),
      () => handler(req, res),
    );
    return;
  }
  handler(req, res);
});

const port = Number(process.env.PORT ?? 4321);
server.listen(port, process.env.HOST ?? "0.0.0.0", () => {
  console.log(`Listening on :${port}`);
  // Load the words (~3 s) and render the homepage once now, not on the first visitors' requests after a deploy.
  const warm = (path) => fetch(`http://127.0.0.1:${port}${path}`).then((r) => r.arrayBuffer());
  warm("/api/search/index.json")
    .then(() => warm("/"))
    .catch(() => {});
});

// Node as PID 1 ignores SIGTERM by default; without this `docker stop` waits 10 s.
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close(() => process.exit(0)));
