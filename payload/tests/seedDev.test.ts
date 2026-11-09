import { describe, expect, it } from "vitest";

import { assertDevDatabase } from "../src/seed/dev";

const url = (host: string, db: string) => `postgres://u:p@${host}:5433/${db}`;

describe("assertDevDatabase", () => {
  it("accepts a local worktree dev database", () => {
    expect(() => assertDevDatabase(url("127.0.0.1", "bsw_my_task"))).not.toThrow();
  });

  it.each([
    ["a throwaway e2e db", url("127.0.0.1", "bsw_my_task_e2e")],
    ["a test db", url("127.0.0.1", "bsw_my_task_test")],
    ["a smoke db", url("localhost", "bs_smoke")],
    ["the prod-like db name", url("127.0.0.1", "bs")],
    ["a remote host", url("db.example.org", "bsw_my_task")],
    ["no url", undefined as unknown as string],
  ])("refuses %s", (_name, value) => {
    expect(() => assertDevDatabase(value)).toThrow(/Refusing to seed/);
  });
});
