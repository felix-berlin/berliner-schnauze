#!/usr/bin/env python3
"""Scans WP entries for overlap with the (removed) Schlobinski corpus.

Reads /tmp/ref/corpus.md and /tmp/ref/wp-export.json (see fetch-wp-words-for-scan.mjs).
Writes reports/schlobinski-scan.csv: IDs, titles, numbers only, never text.
"""
import csv, glob, json, random, re, sys
from collections import Counter

REF = "/tmp/ref"
JSONS = "data/lexikon-import/schlobinski/words-[0-9]*.json"
FIELDS = ["translations", "infoText", "examples", "alternativeWords"]
TR = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"})


def toks(s):
    s = (s or "").lower().translate(TR)
    return re.sub(r"[^a-z0-9]+", " ", s).split()


def grams(t, n):
    return [" ".join(t[i:i + n]) for i in range(len(t) - n + 1)]


def slug(s):
    return "-".join(toks(s))


def field_items(p):
    p = p or {}
    return {
        "translations": [x.get("translation") for x in p.get("translations") or []],
        "infoText": [p.get("infoText")],
        "examples": [v for x in p.get("examples") or [] for v in (x.get("example"), x.get("exampleExplanation"))],
        "alternativeWords": [x.get("alternativeWord") for x in p.get("alternativeWords") or []],
    }


def score(items, n5, n8, text):
    tot5 = hit5 = s8 = words = sub = 0
    for it in items:
        t = toks(it)
        words += len(t)
        g5 = grams(t, 5)
        tot5 += len(g5)
        hit5 += sum(g in n5 for g in g5)
        s8 += sum(g in n8 for g in grams(t, 8))
        if len(t) >= 3 and f" {' '.join(t)} " in text:
            sub = max(sub, len(t))
    c5 = round(hit5 / tot5, 3) if tot5 >= 3 else 0.0
    return c5, s8, sub, words


def build_corpus(path):
    t = toks(open(path, encoding="utf-8").read())
    return set(grams(t, 5)), set(grams(t, 8)), f" {' '.join(t)} "


def trigger(v):
    """Field is cleared when it overlaps the corpus (sub_hit needs >= 5 words)."""
    return v[0] >= 0.20 or v[1] >= 1 or v[2] >= 5


def bucket(sset, sc):
    if any(trigger(v) for v in sc.values()):
        return "A"
    return "B" if sset == "S1" else "C"


def main():
    n5, n8, text = build_corpus(f"{REF}/corpus.md")
    wp = json.load(open(f"{REF}/wp-export.json"))
    js = Counter()
    for p in glob.glob(JSONS):
        for e in json.load(open(p)):
            js[slug(e["word"])] += 1
    rows = []
    for w in wp:
        title = w["title"] or ""
        s = slug(title)
        if s in js or (w["slug"] or "") in js:
            sset = "S1"
        elif title.lower() <= "dampf":
            sset = "S2"
        else:
            sset = "S3"
        items = field_items(w.get("wordProperties"))
        sc = {f: score(items[f], n5, n8, text) for f in FIELDS}
        rows.append((w["databaseId"], title, w["status"], sset, bucket(sset, sc), sc))
    with open(sys.argv[1] if len(sys.argv) > 1 else "reports/schlobinski-scan.csv", "w", newline="", encoding="utf-8") as f:
        cw = csv.writer(f)
        cw.writerow(["id", "title", "status", "set", "bucket"] + [f"{x}_{m}" for x in FIELDS for m in ("c5", "s8", "sublen", "words", "clear")])
        for r in sorted(rows, key=lambda r: r[0]):
            cw.writerow(list(r[:5]) + [v for x in FIELDS for v in (*r[5][x], int(trigger(r[5][x])))])
    cnt = Counter((r[3], r[4]) for r in rows)
    for k in sorted(cnt):
        print(k, cnt[k])
    print("fields to clear", {f: sum(trigger(r[5][f]) for r in rows) for f in FIELDS})
    print("entries to change", sum(r[4] == "A" for r in rows))


if __name__ == "__main__":
    sys.exit(main())
