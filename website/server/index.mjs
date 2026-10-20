// Container entrypoint: wraps the @astrojs/node standalone handler to redirect www and to add the security headers
// to every response, static assets included (plain redirects live in astro.config.mjs `redirects`).
import { createServer } from "node:http";

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
  handler(req, res);
});

const port = Number(process.env.PORT ?? 4321);
server.listen(port, process.env.HOST ?? "0.0.0.0", () => console.log(`Listening on :${port}`));

// Node as PID 1 ignores SIGTERM by default; without this `docker stop` waits 10 s.
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close(() => process.exit(0)));
