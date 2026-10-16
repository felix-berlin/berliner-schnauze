// Container entrypoint: wraps the @astrojs/node standalone handler to add the
// _headers / _redirects rules Cloudflare used to apply.
import { readFileSync } from "node:fs";
import { createServer } from "node:http";

import { matchHeaders, parseHeaders, parseRedirects } from "./staticRules.mjs";

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
  const { pathname } = new URL(req.url ?? "/", "http://localhost");
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
