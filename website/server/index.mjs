// Container entrypoint: wraps the @astrojs/node standalone handler to redirect www and to add the security headers
// to every response, static assets included (plain redirects live in astro.config.mjs `redirects`).
import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname } from "node:path";
import { promisify } from "node:util";
import { brotliCompress, constants, createBrotliCompress, createGzip } from "node:zlib";

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

const COMPRESSIBLE = /^(text\/|application\/(json|javascript|xml|manifest\+json)|image\/svg\+xml)/;

/**
 * Compresses text responses on the fly: the reverse proxy passes them through raw (the search index is 2.9 MB,
 * 0.3 MB compressed). Brotli at quality 4 costs a few ms; only full 200s of 1 KB and more.
 */
const compress = (req, res) => {
  const accept = String(req.headers["accept-encoding"] ?? "");
  const encoding =
    req.method === "HEAD"
      ? undefined
      : /\bbr\b/.test(accept)
        ? "br"
        : /\bgzip\b/.test(accept)
          ? "gzip"
          : undefined;
  const { end, write, writeHead } = res;
  let zip;

  res.writeHead = function (status, ...rest) {
    const reason = typeof rest[0] === "string" ? rest.shift() : undefined;
    for (const [key, value] of Object.entries(rest[0] ?? {})) this.setHeader(key, value);
    if (COMPRESSIBLE.test(String(this.getHeader("Content-Type") ?? ""))) {
      const vary = this.getHeader("Vary");
      this.setHeader("Vary", vary ? `${vary}, Accept-Encoding` : "Accept-Encoding");
      const length = Number(this.getHeader("Content-Length") ?? Infinity);
      if (encoding && status === 200 && length >= 1024 && !this.hasHeader("Content-Encoding")) {
        this.setHeader("Content-Encoding", encoding);
        this.removeHeader("Content-Length");
        zip =
          encoding === "br"
            ? createBrotliCompress({ params: { [constants.BROTLI_PARAM_QUALITY]: 4 } })
            : createGzip();
        zip.on("data", (chunk) => write.call(this, chunk));
        zip.on("drain", () => this.emit("drain"));
        zip.on("end", () => end.call(this));
        this.once("close", () => zip.destroy());
      }
    }
    return writeHead.call(this, status, reason);
  };
  res.write = function (chunk, ...args) {
    if (!this.headersSent) this.writeHead(this.statusCode);
    return zip ? zip.write(chunk, ...args) : write.call(this, chunk, ...args);
  };
  res.end = function (chunk, ...args) {
    if (!this.headersSent) this.writeHead(this.statusCode);
    if (!zip) return end.call(this, chunk, ...args);
    const done = [chunk, ...args].find((a) => typeof a === "function");
    if (done) this.once("finish", done);
    zip.end(
      typeof chunk === "function" ? undefined : chunk,
      typeof args[0] === "string" ? args[0] : undefined,
    );
    return this;
  };
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
 * Hashed build assets never change: compressed once at Brotli's best quality (12 % smaller than quality 4 on the
 * fly) and kept, ~0.3 MB for all. Undefined for anything else, which takes the normal way.
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
      () => {
        compress(req, res);
        handler(req, res);
      },
    );
    return;
  }
  compress(req, res);
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
