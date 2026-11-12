# Worktree-Setup: eigene Datenbank pro Worktree

Jeder Worktree (oder zweite Checkout) bekommt automatisch:

- installierte Abhängigkeiten (`pnpm install`),
- **eine eigene Datenbank** mit den echten Wörtern, kopiert aus einer Vorlage (`bs_template`),
- einen **festen Dev-Login** für das Payload-Admin (immer dieselben Zugangsdaten),
- **eigene Ports**, damit mehrere Worktrees gleichzeitig laufen können,
- die richtigen **Dev-Secrets** (nie Produktion).

Du musst dafür nichts von Hand anlegen. Dieses Dokument erklärt, wie es funktioniert, was du einmalig brauchst und wie du es ohne Orca benutzt.

## Kurzfassung

```text
Orca:       neuen Worktree anlegen  →  Setup läuft von selbst  →  pnpm dev / pnpm cms:dev
Ohne Orca:  git worktree add …      →  bash scripts/orca-setup.sh  →  pnpm dev / pnpm cms:dev
Aufräumen:  bash scripts/orca-archive.sh   (löscht die Datenbank dieses Worktrees)
```

## Einmalig vorbereiten

1. **Docker** muss laufen. Das Setup bricht sonst sofort mit einer klaren Meldung ab.
2. **Infisical**: einmal `npx infisical login`. Im Projekt `berliner-schnauze`, Environment **dev**, müssen im Wurzelpfad `/` diese Secrets stehen:
   - `DEV_ADMIN_EMAIL`, `DEV_ADMIN_PASSWORD`: der feste Admin-Login für lokale Datenbanken,
   - `DEV_MCP_KEY`: ein fester MCP-Key für lokale Datenbanken.

   Optional, im Ordner `/agent` desselben Environments: `PROD_BASIC_AUTH` (`benutzer:passwort`), siehe unten „Produktion lesen“.
3. **Datenbank-Dump** (die echten Daten), einmalig und danach bei Bedarf erneuern:
   1. Backup aus Portabase herunterladen (kommt als `.tar.gz` mit einer `.dump`-Datei).
   2. Entpacken, die `.dump`-Datei nach `~/backups/berliner-schnauze/latest.dump` legen (oder dorthin verlinken).
   3. Vorlage bauen: `bash scripts/dev-template.sh`. Das dauert etwa eine Minute.

   Ohne Dump baut das Skript die Vorlage aus erfundenen Testdaten (mit Warnung). Es gibt dann keine echten Wörter, Bilder und Audios.
4. **Orca** (nur wenn du Orca nutzt): Settings → Repository → Advanced → Command Source auf **„orca.yaml only“**. Das lokale Setup-Feld leer lassen. Orca fragt beim ersten Mal eventuell nach einer Freigabe für das Setup-Kommando.

## Mit Orca

Neuen Worktree anlegen. Orca startet in dem Worktree das Setup (`scripts/orca-setup.sh`), du siehst es im Terminal-Tab `bash`. Danach ist der Worktree startklar:

```bash
pnpm dev        # Website, Port steht in .env.worktree (WEBSITE_PORT)
pnpm cms:dev    # Payload-Admin, Port steht in .env.worktree (CMS_PORT)
```

Anmelden im Admin: E-Mail und Passwort aus Infisical (`DEV_ADMIN_EMAIL`, `DEV_ADMIN_PASSWORD`).

> **Wichtig:** Archivieren (löscht die Datenbank), das Kopieren von `.claude/settings.local.json` und der geteilte Ordner `payload/media` liest Orca aus dem **Haupt-Checkout** (`main`). Das greift erst, wenn `orca.yaml` und `.worktreeinclude` auf `main` liegen. Das Setup selbst liest Orca aus dem neuen Worktree und funktioniert deshalb in jedem Branch, der `orca.yaml` enthält.

## Ohne Orca (Terminal, VS Code, zweiter Checkout)

Das Setup ist ein normales Skript, Orca startet es nur. Du kannst es selbst aufrufen:

```bash
git worktree add ../mein-feature -b feature/mein-feature   # oder ein normaler Clone
cd ../mein-feature
bash scripts/orca-setup.sh        # Deps, Datenbank, Dev-Login, Ports
pnpm dev                          # Website
pnpm cms:dev                      # Admin (zweites Terminal)
```

Der Datenbankname kommt vom Ordnernamen (`mein-feature` wird zu `bsw_mein_feature`). Du kannst das Skript beliebig oft wiederholen, Datenbanken, die schon da sind, bleiben; `.env.worktree` wird neu geschrieben, Migrationen und Dev-Login laufen erneut.

Aufräumen, wenn du den Worktree nicht mehr brauchst:

```bash
bash scripts/orca-archive.sh      # beendet die Dev-Server, löscht die Datenbank und .env.worktree
git worktree remove ../mein-feature
```

**Datenbank zurücksetzen** (zurück auf den Stand der Vorlage): erst `bash scripts/orca-archive.sh`, dann `bash scripts/orca-setup.sh`.

## Befehle im Alltag

Alles, was Secrets oder die Datenbank dieses Worktrees braucht, läuft über `scripts/with-env.sh`. Es lädt die Dev-Secrets aus Infisical (immer **dev**) und danach die Werte dieses Worktrees (`.env.worktree`):

| Was | Befehl |
|---|---|
| Website | `pnpm dev` |
| Payload-Admin | `pnpm cms:dev` |
| Payload-Tests | `scripts/with-env.sh pnpm cms:test` (Testdatenbank `bsw_<name>_test`) |
| Migration | `scripts/with-env.sh env NODE_ENV=production pnpm cms:migrate` |
| Beliebiger Befehl | `scripts/with-env.sh <befehl>` |
| Datenbank ansehen | `docker exec -it bs-dev-postgres psql -U bs -d bsw_<name>` |

`pnpm dev` und `pnpm cms:dev` benutzen `with-env.sh` schon selbst. Die Payload-Tests brauchen den Umweg, damit sie die Test-Datenbank dieses Worktrees finden. Website-Unit-Tests (`pnpm test:unit`) brauchen keine Datenbank.

## Wie es zusammenhängt

- **Ein Postgres für alle:** Der Container `bs-dev-postgres` (eigenes Volume, Port `127.0.0.1:5433`) wird bei Bedarf gestartet. Sein Passwort erzeugt das Setup einmal selbst und legt es in `~/.config/berliner-schnauze/dev-postgres.env` (nur du darfst die Datei lesen). Er hat nichts mit `compose.yaml` zu tun.
- **Vorlage und Kopien:** `bs_template` enthält die echten Daten aus dem Dump, migriert auf den aktuellen Stand. Jeder Worktree bekommt per `CREATE DATABASE … TEMPLATE` in Sekunden eine eigene Kopie `bsw_<name>` plus eine leere Testdatenbank `bsw_<name>_test`.
- **Login-Daten fehlen in der Vorlage:** Beim Bau werden Passwort-Hashes, API-Keys, Sessions und MCP-Keys der echten User entfernt. Stattdessen legt das Setup den festen Dev-Admin an (aus `DEV_ADMIN_EMAIL` und `DEV_ADMIN_PASSWORD`). Hat dein Produktions-User dieselbe E-Mail, bekommt er in der lokalen Kopie dieses Dev-Passwort.
- **Ports:** Sie werden aus dem Worktree-Namen berechnet (Website ab 4400, CMS ab 3100, E2E ab 5400) und stehen in `.env.worktree`. Zwei Worktrees mit zufällig gleichem Port sind unwahrscheinlich, aber möglich: dann Ports in der Datei ändern (ein erneutes `orca-setup.sh` setzt sie zurück).
- **`.env.worktree`:** wird vom Setup geschrieben, ist git-ignoriert und enthält auch das Datenbank-Passwort. Nicht teilen, nicht committen.

Dateien: `orca.yaml` (Orca-Hooks), `scripts/orca-setup.sh`, `scripts/orca-archive.sh`, `scripts/dev-template.sh`, `scripts/with-env.sh`, `scripts/prod-curl.sh`, `scripts/lib/dev-db.sh` (gemeinsame Funktionen), `payload/src/scripts/devAccess.ts` (Dev-Admin und MCP-Key).

## Neue Daten (frischer Dump)

```bash
bash scripts/dev-template.sh      # nimmt ~/backups/berliner-schnauze/latest.dump
```

Neue Worktrees bekommen den neuen Stand. Bereits angelegte Worktree-Datenbanken behalten ihre Kopie (zurücksetzen: siehe oben).

## Produktion lesen (Basic-Auth)

Hinter der Basic-Auth-Schranke kommt man mit dem Skript durch. Es erlaubt nur lesende Zugriffe auf `berliner-schnauze.wtf`:

```bash
scripts/prod-curl.sh -I https://berliner-schnauze.wtf/        # nur Header
scripts/prod-curl.sh https://berliner-schnauze.wtf/wort/aasen
scripts/prod-curl.sh --stats -H 'Accept-Encoding: br' https://berliner-schnauze.wtf/api/search/index.json   # Header, Bytes, Zeiten
```

Das Zugangsdatum liegt in Infisical (dev, Ordner `/agent`, Secret `PROD_BASIC_AUTH`) und wird nur zur Laufzeit eingesetzt. Es wird nie angezeigt oder gespeichert. Erlaubt sind nur `-I -i -s -S` (auch kombiniert), `--compressed`, `--stats` (Antwort-Header, Status, übertragene Bytes und Zeiten, ohne Body), `-H` mit einer festen Liste von Request-Headern (Schreibweise wie hier) (`Accept`, `Accept-Encoding`, `Accept-Language`, `Cache-Control`, `If-Modified-Since`, `If-None-Match`, `Range`) und genau eine URL auf `berliner-schnauze.wtf`.

## Regeln

- **Nie Produktion lokal:** `with-env.sh` ruft Infisical immer mit `--env=dev` auf; prod lässt sich darüber nicht wählen. `.infisical.yaml` ordnet jeden Branch (auch `main`) dem Environment dev zu.
- **Kein Browser gegen die echte Seite:** Playwright und Chrome DevTools nie gegen `berliner-schnauze.wtf` richten, jeder Seitenaufruf zählt im Produktions-Matomo. `curl` oder `scripts/prod-curl.sh` sind in Ordnung. Dev hat eine eigene Matomo-ID.
- **Der Dump enthält personenbezogene Daten** (Vorschläge mit Name und Mail). Er gehört nie ins Repo und nie in den Chat. Er liegt außerhalb des Repos in `~/backups/berliner-schnauze/`.
- **Keine Secrets in Dateien oder im Chat:** Werte bleiben in Infisical. Die Skripte lesen sie zur Laufzeit.

## Wenn etwas nicht klappt

| Meldung / Symptom | Ursache und Lösung |
|---|---|
| `Docker is not running` | Docker starten, dann `bash scripts/orca-setup.sh` im Worktree wiederholen. |
| `dev admin not created` (Warnung, kein Abbruch) | `npx infisical login` fehlt, oder `DEV_ADMIN_EMAIL`, `DEV_ADMIN_PASSWORD`, `DEV_MCP_KEY` stehen nicht in Infisical dev (Wurzelpfad `/`). Nachholen: `scripts/with-env.sh env NODE_ENV=production pnpm --filter payload-app dev:access` |
| `no backup at …` / Wörter fehlen | Kein Dump unter `~/backups/berliner-schnauze/latest.dump`: Dump ablegen und `bash scripts/dev-template.sh` ausführen. Neue Worktrees bekommen dann echte Daten. |
| `refusing …only a local database` | `DATABASE_URL` zeigt nicht auf `127.0.0.1`. Ist so gewollt: der Dev-Login wird nur in lokale Datenbanken geschrieben. |
| Port belegt | In `.env.worktree` `WEBSITE_PORT` oder `CMS_PORT` ändern (ein erneutes Setup setzt sie zurück). |
| Datenbank `bsw_…` bleibt nach dem Löschen eines Orca-Worktrees stehen | Das Archive-Skript läuft erst, wenn `orca.yaml` auf `main` liegt. Von Hand: `docker exec bs-dev-postgres psql -U bs -d postgres -c 'DROP DATABASE "bsw_<name>" WITH (FORCE)'` |
| Orca startet das Setup nicht | Command Source muss auf „orca.yaml only“ stehen, und die Freigabe für das Kommando muss bestätigt sein. |
| Container-Log ansehen | `docker logs bs-dev-postgres` |
