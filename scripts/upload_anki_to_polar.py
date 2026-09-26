#!/usr/bin/env python3
"""Laedt ein gebautes Full-Anki-Deck zu Polar hoch und ersetzt die Datei,
die am Full-Deck-Downloadable-Benefit haengt.

Aufruf (Secrets ueber Infisical):
    npx infisical run -- .venv-anki/bin/python scripts/upload_anki_to_polar.py \
        dist-anki/berlinerisch-full-v3.52.0.apkg --version 3.52.0

Benoetigt POLAR_UPLOAD_TOKEN (Scopes files:write, benefits:write) und
ANKI_DECK_FULL_BENEFIT_ID. POLAR_SANDBOX=true nutzt die Polar-Sandbox statt Prod.
"""
import argparse
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.request

API_HOSTS = {"prod": "https://api.polar.sh", "sandbox": "https://sandbox-api.polar.sh"}


def api_host():
    return API_HOSTS["sandbox"] if os.environ.get("POLAR_SANDBOX") == "true" else API_HOSTS["prod"]


def _request(method, url, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        sys.exit("Polar-API-Fehler %s %s: %s" % (method, url, e.read().decode(errors="replace")))


def create_file(token, name, size, version=None):
    # ponytail: chunk_end als inklusiver letzter Byte-Index angenommen (0..size-1) -
    # unverifiziert, da noch kein files:write-Token live getestet wurde. Schlaegt
    # der erste echte CI-Lauf hier fehl, ist das der erste Punkt zum Nachschauen.
    body = {
        "service": "downloadable",
        "name": name,
        "mime_type": mimetypes.guess_type(name)[0] or "application/octet-stream",
        "size": size,
        "upload": {"parts": [{"number": 1, "chunk_start": 0, "chunk_end": size - 1}]},
    }
    if version:
        body["version"] = version
    return _request("POST", api_host() + "/v1/files/", token=token, body=body)


def upload_part(part, data):
    req = urllib.request.Request(part["url"], data=data, headers=part.get("headers") or {}, method="PUT")
    with urllib.request.urlopen(req, timeout=120) as r:
        etag = (r.headers.get("ETag") or "").strip('"')
    if not etag:
        sys.exit("Kein ETag von S3 nach dem Upload erhalten.")
    return etag


def complete_upload(token, file_id, upload_id, upload_path, etag):
    body = {"id": upload_id, "path": upload_path, "parts": [{"number": 1, "checksum_etag": etag}]}
    return _request("POST", "%s/v1/files/%s/uploaded" % (api_host(), file_id), token=token, body=body)


def get_benefit_file_ids(token, benefit_id):
    benefit = _request("GET", "%s/v1/benefits/%s" % (api_host(), benefit_id), token=token)
    return list((benefit.get("properties") or {}).get("files") or [])


def update_benefit_file(token, benefit_id, file_id):
    body = {"type": "downloadables", "properties": {"files": [file_id]}}
    _request("PATCH", "%s/v1/benefits/%s" % (api_host(), benefit_id), token=token, body=body)


def delete_file(token, file_id):
    _request("DELETE", "%s/v1/files/%s" % (api_host(), file_id), token=token)


def upload_full_deck(path, token, benefit_id, version=None):
    name = os.path.basename(path)
    size = os.path.getsize(path)
    with open(path, "rb") as f:
        data = f.read()

    created = create_file(token, name, size, version=version)
    etag = upload_part(created["upload"]["parts"][0], data)
    complete_upload(token, created["id"], created["upload"]["id"], created["upload"]["path"], etag)

    # Neue Datei zuerst anhaengen, dann erst die alte(n) loeschen - so haengt bei
    # einem Abbruch zwischendrin nie eine leere Datei-Liste am Benefit.
    old_file_ids = get_benefit_file_ids(token, benefit_id)
    update_benefit_file(token, benefit_id, created["id"])
    for old_id in old_file_ids:
        if old_id != created["id"]:
            delete_file(token, old_id)
    return created["id"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("apkg_path")
    parser.add_argument("--version", default=None)
    args = parser.parse_args()

    token = os.environ.get("POLAR_UPLOAD_TOKEN")
    benefit_id = os.environ.get("ANKI_DECK_FULL_BENEFIT_ID")
    if not token or not benefit_id:
        sys.exit("POLAR_UPLOAD_TOKEN und ANKI_DECK_FULL_BENEFIT_ID muessen gesetzt sein.")

    file_id = upload_full_deck(args.apkg_path, token, benefit_id, version=args.version)
    print("Full-Deck hochgeladen (Version %s), neue Datei-ID: %s" % (args.version or "?", file_id))


if __name__ == "__main__":
    main()
