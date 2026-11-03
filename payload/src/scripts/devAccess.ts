/**
 * Gives a local database the same login in every worktree: the dev admin and an MCP key, both from env (Infisical
 * dev: DEV_ADMIN_EMAIL, DEV_ADMIN_PASSWORD, DEV_MCP_KEY), so credentials never change when a worktree is recreated.
 * Idempotent; local databases only. Usage (called by scripts/orca-setup.sh):
 * `scripts/with-env.sh env NODE_ENV=production pnpm --filter payload-app dev:access`
 */
import { LOCAL_DB_HOSTS } from "../lib/localDb";

const url = process.env["DATABASE_URL"];
const host = url && URL.canParse(url) ? new URL(url).hostname : "";
if (!LOCAL_DB_HOSTS.has(host)) {
  console.error(
    `[dev-access] refusing "${host || String(url)}": only a local database gets the dev login`,
  );
  process.exit(1);
}

const email = process.env["DEV_ADMIN_EMAIL"];
const password = process.env["DEV_ADMIN_PASSWORD"];
const apiKey = process.env["DEV_MCP_KEY"];
if (!email || !password || !apiKey) {
  console.error(
    "[dev-access] set DEV_ADMIN_EMAIL, DEV_ADMIN_PASSWORD and DEV_MCP_KEY in Infisical (dev)",
  );
  process.exit(1);
}

const [{ getPayload }, { default: config }] = await Promise.all([
  import("payload"),
  import("../payload.config"),
]);
const payload = await getPayload({ config });

/** `find` by `where`, then `update` or `create`: the script runs once per worktree setup, any number of times. */
async function upsert(
  collection: "users" | "payload-mcp-api-keys",
  where: Record<string, unknown>,
  data: Record<string, unknown>,
): Promise<{ id: number }> {
  const { docs } = await payload.find({
    collection,
    where,
    limit: 1,
    depth: 0,
    overrideAccess: true,
  } as never);
  return (
    docs[0]
      ? payload.update({ collection, id: docs[0].id, data } as never)
      : payload.create({ collection, data } as never)
  ) as Promise<{ id: number }>;
}

const user = await upsert("users", { email: { equals: email } }, { email, password });

// Same capabilities as the production key: words find/create/update, suggestions find/update (see mcp.ts)
await upsert(
  "payload-mcp-api-keys",
  { label: { equals: "dev" } },
  {
    user: user.id,
    label: "dev",
    enableAPIKey: true,
    apiKey,
    words: { find: true, create: true, update: true },
    suggestions: { find: true, update: true },
  },
);

console.log("[dev-access] dev admin and MCP key ready");
process.exit(0);
