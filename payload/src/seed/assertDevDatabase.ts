import { LOCAL_DB_HOSTS } from "../lib/localDb";

/** Only a worktree's own dev database (`bsw_<workspace>`): not prod, not the throwaway e2e/smoke/test databases. */
export function assertDevDatabase(url: string | undefined): void {
  const parsed = url && URL.canParse(url) ? new URL(url) : undefined;
  const raw = parsed?.pathname.slice(1) ?? "";
  // The driver decodes the path (`bsw_x%5Fe2e` is `bsw_x_e2e`), so check the decoded name; a malformed escape is refused.
  let name: string;
  try {
    name = decodeURIComponent(raw);
  } catch {
    throw new Error("Refusing to seed: the database name in DATABASE_URL has a malformed % escape");
  }
  if (
    !parsed ||
    !LOCAL_DB_HOSTS.has(parsed.hostname) ||
    !name.startsWith("bsw_") ||
    /_(e2e|smoke|test)$/.test(name)
  ) {
    throw new Error(
      `Refusing to seed "${name || String(url)}": only a local worktree dev database (bsw_<workspace>) is allowed`,
    );
  }
}
