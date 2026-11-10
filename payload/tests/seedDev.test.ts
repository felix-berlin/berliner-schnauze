import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

import { assertDevDatabase } from "../src/seed/dev";

const url = (host: string, db: string) => `postgres://u:p@${host}:5433/${db}`;

describe("assertDevDatabase", () => {
  it("accepts a local worktree dev database", () => {
    expect(() => assertDevDatabase(url("127.0.0.1", "bsw_my_task"))).not.toThrow();
  });

  it("accepts the IPv6 loopback in brackets", () => {
    expect(() => assertDevDatabase(url("[::1]", "bsw_my_task"))).not.toThrow();
  });

  it.each([
    ["a throwaway e2e db", url("127.0.0.1", "bsw_my_task_e2e")],
    ["a test db", url("127.0.0.1", "bsw_my_task_test")],
    ["a smoke db", url("localhost", "bs_smoke")],
    ["the prod-like db name", url("127.0.0.1", "bs")],
    ["a remote host", url("db.example.org", "bsw_my_task")],
    ["no url", undefined as unknown as string],
    ["a malformed url", "not a url"],
    ["an unbracketed ::1 (no valid url)", "postgres://u:p@::1:5433/bsw_my_task"],
    ["an uppercase prefix", url("127.0.0.1", "BSW_my_task")],
    ["a percent-encoded e2e suffix", url("127.0.0.1", "bsw_my_task%5Fe2e")],
    ["a percent-encoded test suffix", url("127.0.0.1", "bsw_my_task%5Ftest")],
    ["a malformed escape", url("127.0.0.1", "bsw_my_task%zz_e2e")],
  ])("refuses %s", (_name, value) => {
    expect(() => assertDevDatabase(value)).toThrow(/Refusing to seed/);
  });
});

describe("seed:dev CLI wiring", () => {
  // Runs the real entry with a remote-looking, unresolvable host: the guard must exit non-zero before Payload is imported,
  // so nothing ever tries to connect (a connect attempt would show up as a DNS/ECONN error instead of the refusal).
  it("exits non-zero on a prod-like DATABASE_URL before any Payload init", () => {
    const { VITEST: _vitest, ...env } = process.env;
    const run = spawnSync("./node_modules/.bin/payload", ["run", "src/seed/dev.ts"], {
      cwd: new URL("..", import.meta.url),
      encoding: "utf8",
      env: { ...env, DATABASE_URL: "postgres://u:p@db.invalid:5432/bs", NODE_OPTIONS: "--no-deprecation" },
      timeout: 60_000,
    });
    expect(run.status).not.toBe(0);
    expect(run.stderr).toMatch(/Refusing to seed "bs"/);
    expect(run.stderr).not.toMatch(/ENOTFOUND|ECONNREFUSED|getaddrinfo/);
  }, 90_000);
});
