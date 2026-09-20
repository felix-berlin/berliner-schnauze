#!/usr/bin/env python3
"""Baut die Anki-Decks (Lite + Full) aus den veröffentlichten WordPress-Wörtern.

Aufruf (Secrets über Infisical):
    npx infisical run -- .venv-anki/bin/python scripts/build_anki_decks.py
Optional: ANKI_FULL_URL (Standard: <SITE>/anki). Ausgabe: dist-anki/*.apkg
"""
import base64
import html
import json
import os
import re
import sys
import urllib.request
from collections import defaultdict

import genanki

SITE = "https://berliner-schnauze.wtf"
OUT_DIR = "dist-anki"
FULL_DECK_ID = 1734921001
LITE_DECK_ID = 1734921002
MODEL_ID = 1734921003
UMLAUTS = {"ä": "a", "ö": "o", "ü": "u", "ß": "s"}


def clean(value):
    if isinstance(value, list):
        value = " ".join(str(v) for v in value)
    text = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def normalize_word(node):
    p = node.get("wordProperties") or {}
    translations = [clean(x.get("translation")) for x in p.get("translations") or []]
    examples = [
        (clean(x.get("example")), clean(x.get("exampleExplanation")))
        for x in p.get("examples") or []
    ]
    alternatives = [clean(x.get("alternativeWord")) for x in p.get("alternativeWords") or []]
    return {
        "id": node["databaseId"],
        "slug": node["slug"],
        "title": clean(p.get("berlinerisch") or node.get("title")),
        "article": clean(p.get("article")),
        "translations": [t for t in translations if t],
        "examples": [e for e in examples if e[0]],
        "alternatives": [a for a in alternatives if a],
    }


def is_publishable(word):
    return bool(word["title"] and word["translations"])


def letter(title):
    ch = title.strip()[:1].lower()
    ch = UMLAUTS.get(ch, ch)
    return ch.upper() if len(ch) == 1 and "a" <= ch <= "z" else "Sonstige"


def score(word):
    return 2 * len(word["examples"]) + len(word["alternatives"]) + len(word["translations"]) - 1


def select_lite(words):
    groups = defaultdict(list)
    for w in words:
        groups[letter(w["title"])].append(w)
    picked = []
    for group in groups.values():
        group.sort(key=lambda w: (-score(w), w["title"].lower(), w["id"]))
        picked.extend(group[: max(1, -(-len(group) // 10))])  # ceil(10 %), ganzzahlig
    return sorted(picked, key=lambda w: (w["title"].lower(), w["id"]))
