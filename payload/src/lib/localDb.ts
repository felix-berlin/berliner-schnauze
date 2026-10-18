/** Hosts of a local database: the guards of the importer and the e2e seed only write to these. */
export const LOCAL_DB_HOSTS: ReadonlySet<string> = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
