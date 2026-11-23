import { describe, expect, it } from "vitest";

import { REPO_ROOT, resolveExportPath } from "../src/lib/exportPath";

describe("resolveExportPath", () => {
  it("derives the repository root from the file location, not the cwd", () => {
    expect(resolveExportPath("/tmp/replies.json", REPO_ROOT)).toBe("/tmp/replies.json");
  });

  it("refuses a path inside the repository, also a relative one resolved against it", () => {
    expect(() => resolveExportPath(`${REPO_ROOT}/data/x.json`)).toThrow(/inside the repository/);
    expect(() => resolveExportPath("/repo/payload/x.json", "/repo")).toThrow(/inside/);
    expect(() => resolveExportPath("/repo", "/repo")).toThrow(/inside/);
  });

  it("accepts a sibling that only shares the name prefix", () => {
    expect(resolveExportPath("/repo-backup/x.json", "/repo")).toBe("/repo-backup/x.json");
  });
});
