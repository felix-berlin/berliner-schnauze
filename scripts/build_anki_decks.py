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


FIELDS = ["Berlinerisch", "Artikel", "Uebersetzungen", "Beispiele", "Alternativen", "Link", "Hinweis"]

CSS = """
.card { font-family: system-ui, sans-serif; font-size: 20px; text-align: center; color: #2b333b; background: #fff; }
.art { color: #cf5736; font-size: 0.8em; min-height: 1em; }
.word { font-size: 1.6em; font-weight: 700; border-bottom: 2px dashed #cf5736; display: inline-block; padding-bottom: 2px; }
ul { list-style: none; padding: 0; margin: 0.6em 0; }
.ex { margin: 0.8em 0 0; font-style: italic; }
.ex small { font-style: normal; color: #4e545a; }
.alt, .link, .hint { font-size: 0.75em; margin-top: 1em; color: #4e545a; }
.hint { border-top: 1px dashed #fad0b0; padding-top: 0.6em; }
@media (prefers-color-scheme: dark) { .card { background: #2b333b; color: #fcead7; } .ex small, .alt, .link, .hint { color: #fad0b0; } }
.nightMode .card { background: #2b333b; color: #fcead7; }
"""

MODEL = genanki.Model(
    MODEL_ID,
    "Berliner Schnauze Wort",
    fields=[{"name": n} for n in FIELDS],
    templates=[
        {
            "name": "Berlinerisch → Deutsch",
            "qfmt": '<div class="art">{{Artikel}}</div><div class="word">{{Berlinerisch}}</div>',
            "afmt": (
                "{{FrontSide}}<hr id=answer>{{Uebersetzungen}}{{Beispiele}}"
                '{{#Alternativen}}<div class="alt">{{Alternativen}}</div>{{/Alternativen}}'
                '<div class="link">{{Link}}</div>'
                '{{#Hinweis}}<div class="hint">{{Hinweis}}</div>{{/Hinweis}}'
            ),
        }
    ],
    css=CSS,
)


def note_fields(word, hint_html):
    esc = html.escape
    examples = "".join(
        '<p class="ex">%s<br><small>%s</small></p>' % (esc(ex), esc(expl))
        for ex, expl in word["examples"][:2]
    )
    alternatives = "Auch: " + esc(", ".join(word["alternatives"])) if word["alternatives"] else ""
    link = '<a href="%s/wort/%s">Mehr zu „%s"</a>' % (SITE, esc(word["slug"]), esc(word["title"]))
    return [
        esc(word["title"]),
        esc(word["article"]),
        "<ul>%s</ul>" % "".join("<li>%s</li>" % esc(t) for t in word["translations"]),
        examples,
        alternatives,
        link,
        hint_html,
    ]


def make_note(word, hint_html):
    return genanki.Note(
        model=MODEL,
        fields=note_fields(word, hint_html),
        guid=genanki.guid_for(word["id"]),
        tags=[letter(word["title"])],
    )


def build_decks(words, full_url):
    words = sorted((w for w in words if is_publishable(w)), key=lambda w: (w["title"].lower(), w["id"]))
    lite_ids = {w["id"] for w in select_lite(words)}
    hint = 'Lite-Version mit 10 %% der Wörter. Alle Wörter: <a href="%s">%s</a>' % (
        html.escape(full_url),
        html.escape(full_url),
    )
    full = genanki.Deck(FULL_DECK_ID, "Berliner Schnauze Full")
    lite = genanki.Deck(LITE_DECK_ID, "Berliner Schnauze Lite")
    for w in words:
        full.add_note(make_note(w, ""))
        if w["id"] in lite_ids:
            lite.add_note(make_note(w, hint))
    check_decks(full, lite, words)
    return full, lite


def check_decks(full, lite, words):
    publishable = [w for w in words if is_publishable(w)]
    assert len(full.notes) == len(publishable), "Full: Kartenzahl weicht von den Wörtern ab"
    full_guids = [n.guid for n in full.notes]
    assert len(set(full_guids)) == len(full_guids), "doppelte GUIDs"
    assert {n.guid for n in lite.notes} <= set(full_guids), "Lite-GUID fehlt in Full"
    full_letters = {t for n in full.notes for t in n.tags}
    lite_letters = {t for n in lite.notes for t in n.tags}
    assert lite_letters == full_letters, "Buchstaben fehlen im Lite-Deck"
    assert len(lite.notes) <= len(full.notes) // 10 + len(full_letters), "Lite ist zu groß"
