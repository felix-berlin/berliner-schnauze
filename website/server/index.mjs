// Container entrypoint: wraps the @astrojs/node standalone handler to add the
// _headers / _redirects rules Cloudflare used to apply.
import { readFileSync } from "node:fs";
import { createServer } from "node:http";

import { matchHeaders, parseHeaders, parseRedirects } from "./staticRules.mjs";

const CANONICAL_HOST = "berliner-schnauze.wtf";

process.env.ASTRO_NODE_AUTOSTART = "disabled";
const { handler } = await import("../dist/server/entry.mjs");

const read = (name) => {
  try {
    return readFileSync(new URL(`../dist/client/${name}`, import.meta.url), "utf8");
  } catch {
    return "";
  }
};
const headerRules = parseHeaders(read("_headers"));
const redirects = parseRedirects(read("_redirects"));

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
  const redirect = redirects.get(pathname);
  if (redirect) {
    res.writeHead(redirect.status, { Location: redirect.to }).end();
    return;
  }
  for (const [key, value] of matchHeaders(headerRules, pathname)) res.setHeader(key, value);
  handler(req, res);
});

const port = Number(process.env.PORT ?? 4321);
server.listen(port, process.env.HOST ?? "0.0.0.0", () => console.log(`Listening on :${port}`));

// Node as PID 1 ignores SIGTERM by default; without this `docker stop` waits 10 s.
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close(() => process.exit(0)));
