import { isAbsolute, relative, resolve } from "node:path";

/** Repository root, derived from this file (`payload/src/lib/`), not from the working directory. */
export const REPO_ROOT = resolve(import.meta.dirname, "../../..");

/** Resolves the export path and refuses one inside the repository (the export holds personal data). */
export const resolveExportPath = (target: string, repoRoot = REPO_ROOT): string => {
  const file = resolve(target);
  const rel = relative(repoRoot, file);
  if (rel === "" || !(rel.startsWith("..") || isAbsolute(rel)))
    throw new Error(`Refusing to write the export inside the repository: ${file}`);
  return file;
};
