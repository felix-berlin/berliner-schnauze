#!/usr/bin/env node
/**
 * Clears the corpus-overlapping ACF fields listed in reports/schlobinski-scan.csv
 * (columns <field>_clear = 1). Everything else (title, slug, status, themen, other
 * fields) stays untouched and is verified after each write.
 *
 * Usage: infisical run -- node scripts/clear-schlobinski-fields.mjs [--dry-run] [--ids 1,2] [--limit N]
 * Backup (full acf per touched entry, JSONL) goes to ~/backups-schlobinski/, never into the repo.
 */
import { readFileSync, mkdirSync, appendFileSync, chmodSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const ACF_OF = { translations: "translations", infoText: "info_text", examples: "examples", alternativeWords: "alternative_words" };
const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const arg = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const only = arg("--ids")?.split(",").map(Number);
const limit = Number(arg("--limit") ?? Infinity);
const BATCH = 50;

const base = process.env.WP_REST_API.replace(/\/$/, "") + "/wp/v2/berlinerisch";
const headers = {
  Authorization: "Basic " + Buffer.from(`${process.env.WP_AUTH_USER}:${process.env.WP_AUTH_PASS}`).toString("base64"),
  "Content-Type": "application/json",
};
const req = async (path, opt = {}) => {
  const r = await fetch(base + path, { ...opt, headers, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`${opt.method ?? "GET"} ${path} -> ${r.status}`);
  return r.json();
};

// tiny CSV parser (title may contain quoted commas)
const parse = (t) => {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; }
    else if (c !== "\r") f += c;
  }
  const [h, ...d] = rows;
  return d.filter((r) => r.length === h.length).map((r) => Object.fromEntries(h.map((k, i) => [k, r[i]])));
};

const jobs = parse(readFileSync("reports/schlobinski-scan.csv", "utf8"))
  .map((r) => ({ id: +r.id, title: r.title, fields: Object.keys(ACF_OF).filter((f) => r[f + "_clear"] === "1") }))
  .filter((j) => j.fields.length && (!only || only.includes(j.id)))
  .slice(0, limit);

const perField = {};
for (const j of jobs) for (const f of j.fields) perField[f] = (perField[f] ?? 0) + 1;
console.log(`${DRY ? "DRY-RUN " : ""}entries=${jobs.length} fields=`, perField);
if (DRY) process.exit(0);

const dir = join(homedir(), "backups-schlobinski");
mkdirSync(dir, { mode: 0o700, recursive: true });
const backup = join(dir, `fields-backup-${new Date().toISOString().slice(0, 10)}.jsonl`);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const empty = (v) => v == null || v === "" || v === false || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Object.keys(v).length);

let done = 0;
for (let i = 0; i < jobs.length; i += BATCH) {
  for (const j of jobs.slice(i, i + BATCH)) {
    const before = await req(`/${j.id}?context=edit`);
    appendFileSync(backup, JSON.stringify({ id: j.id, title: before.title?.raw ?? before.title, status: before.status, acf: before.acf }) + "\n", { mode: 0o600 });
    const acf = { berlinerisch: before.acf.berlinerisch }; // required by the ACF REST schema, sent unchanged
    for (const f of j.fields) acf[ACF_OF[f]] = ACF_OF[f] === "info_text" ? "" : [];
    await req(`/${j.id}`, { method: "POST", body: JSON.stringify({ acf, meta: { needs_rewrite: 1 } }) });
    const after = await req(`/${j.id}?context=edit`);
    const cleared = Object.keys(acf).filter((k) => k !== "berlinerisch");
    const bad =
      cleared.filter((k) => !empty(after.acf[k])).map((k) => `not-empty:${k}`)
        .concat(after.status !== before.status ? ["status"] : [], after.slug !== before.slug ? ["slug"] : [],
          eq(after["berlinerisch-themen"], before["berlinerisch-themen"]) ? [] : ["themen"],
          Object.keys(before.acf).filter((k) => !cleared.includes(k) && !eq(before.acf[k], after.acf[k])).map((k) => `changed:${k}`));
    if (bad.length) { console.error(`STOP id=${j.id}: ${bad.join(",")}`); process.exit(1); }
    done++;
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log(`batch ok: ${done}/${jobs.length}`);
}
console.log("backup:", backup);
