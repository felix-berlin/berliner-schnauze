# payload-app: CMS für Berliner Schnauze

Payload 3 (Admin + REST/GraphQL, Postgres). Die Astro-Seite in `website/` liest ihre Inhalte von hier; WordPress dient nur noch als Import-Quelle bis zum Cutover.

## Einrichten von null

**1. Env-Variablen anlegen.** Für `pnpm cms:dev`, `cms:test` und `cms:migrate` reicht eine git-ignorierte `payload/.env` (Next und die Payload-CLI laden sie aus `payload/`, die Root-`.env` sieht `payload/` nicht; Infisical-Werte haben Vorrang). Compose liest dagegen die Root-`.env`. Vorlage: `.env.example`:

| Variable | Bedeutung | Lokal |
| --- | --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Compose-Postgres | z. B. `berliner`, selbst gewähltes Passwort, `berliner_schnauze` |
| `DATABASE_URL` | Verbindung der App | `postgres://<user>:<pw>@127.0.0.1:5432/<db>` |
| `DATABASE_URL_TEST` | nur Tests, **Name muss auf `_test` enden** | `postgres://<user>:<pw>@127.0.0.1:5432/bs_test` |
| `PAYLOAD_SECRET` | Signatur für Sessions/Keys | langer Zufallsstring |
| `PAYLOAD_SERVER_URL` | Basis-URL des Admins | lokal `http://localhost:3001`, Produktion `https://cms.berliner-schnauze.wtf` |
| `MEDIA_DIR` | Ablage der Uploads | leer lassen (= `payload/media`) |
| `WP_API`, `WP_AUTH_USER`, `WP_AUTH_PASS` | nur für den Import (liegen schon in Infisical) | – |

`compose.yaml` bricht ab, wenn `POSTGRES_PASSWORD`, `PAYLOAD_SECRET` oder `PAYLOAD_SERVER_URL` fehlen, auch wenn du nur Postgres startest.

**2. Postgres starten und die Test-DB anlegen** (einmalig):

```bash
docker compose up -d postgres
docker compose exec postgres createdb -U "$POSTGRES_USER" bs_test
```

**3. Admin starten:**

```bash
pnpm install
pnpm cms:dev          # http://localhost:3001/admin
```

Beim ersten Aufruf den ersten Admin anlegen. Im Dev-Modus pusht Payload das Schema selbst in die DB.

**4. Inhalte aus WordPress holen** (dauert, lädt alle Medien):

```bash
npx infisical run -- pnpm --filter payload-app import:wp
```

Der Report am Ende zeigt `created`/`updated` je Typ; Exit-Code 1 und eine `failures`-Liste, wenn etwas schiefging. Ein zweiter Lauf aktualisiert nur, dupliziert nichts. Vorhandene Medien werden nicht neu geladen. Erwartet: rund 5900 Wörter, höchstens etwa 100 Posts, 2 Seiten.

**5. Prüfen:**

- Im Admin `wa`, `anmachen`, `aasen` ansehen (Übersetzungen, Audio, Bilder, Themen, SEO, Gruppe „derived“).
- Alter Medien-Link: `curl -sI localhost:3001/wp-content/uploads/na_allet_in_butta.mp3` liefert 301.
- Ohne Login gesperrt: `curl -s localhost:3001/api/words` liefert 403.

**6. Tests:**

```bash
pnpm cms:test
```

Ohne `DATABASE_URL_TEST` brechen die Tests ab (sie werden nie übersprungen); sie löschen Zeilen, daher nur gegen die `*_test`-DB.

**7. Container testen** (optional, so läuft es später in Produktion):

```bash
docker compose up --build cms postgres   # Image aus payload/Dockerfile, Port 3001
```

Der Container läuft mit `NODE_ENV=production` und führt die Migrationen aus. Eine per Push befüllte Dev-DB nie an diesen Container hängen, dafür eine frische DB nehmen.

## Entwickeln mit Astro und Payload

Die Astro-Seite (Workspace-Package `website/`) liest Payload im selben Prozess über die Local API. `pnpm dev` braucht deshalb Infisical und eine laufende Postgres mit den CMS-Daten; `pnpm cms:dev` brauchst du nur zum Editieren.

```bash
docker compose up -d postgres   # einmal
pnpm cms:dev                    # Terminal 1: Payload-Admin, :3001
pnpm dev                        # Terminal 2: Astro (website/), :4321
```

Seiten rendern auf Anfrage mit etwa 60 s Cache, ein Edit im Admin ist ohne Rebuild sichtbar. Das Schema pusht nur `cms:dev`, Astro nie. Die Payload-DB füllt `import:wp`.

## Admin-User

- **Lokal:** Solange die DB keinen User hat, zeigt `http://localhost:3001/admin` das Formular „Create first user“. Weitere User (und API-Key-User für Skripte, „Enable API Key“ anhaken) legst du im Admin unter *Users* an. Das gilt pro Datenbank, eine neu aufgesetzte Dev-DB braucht den User erneut.
- **Produktion:** Im `cms`-Container sperrt `usersCreate` (`src/access.ts`) `POST /api/users`, außer `PAYLOAD_ALLOW_FIRST_USER=true` ist gesetzt. `/api/users/first-register` umgeht diese Sperre: den ersten Admin anlegen, **bevor** `cms.berliner-schnauze.wtf` öffentlich erreichbar ist, danach `PAYLOAD_ALLOW_FIRST_USER` wieder entfernen.

## Alltag

**Schema ändern:**

1. Collection/Global in `src/` anpassen.
2. `pnpm --filter payload-app generate:types`
3. **Immer** `pnpm cms:migrate:create <name>` und die Migration committen. CI schlägt bei Drift fehl. Prüfen, dass Typänderungen (z. B. Text → JSON) ein `USING` haben, sonst scheitert Postgres.
4. `pnpm cms:migrate` wendet Migrationen auf `DATABASE_URL` an. Die Dev-DB braucht das nicht (sie wird per Push befüllt), der `cms`-Container führt sie beim Start selbst aus. Scheitert der Dev-Push an einer Spaltenänderung, die Spalte in der Dev-DB droppen oder die DB neu aufsetzen.

Neue Collections und Globals bekommen `access: { read/create/update/delete: authenticated }` aus `src/access.ts` und einen `Forbidden`-Test in `tests/access.test.ts`.

**API aus Skripten** (Anki-Build, Maintenance): im Admin einen User mit „Enable API Key“ anlegen und senden:

```http
Authorization: users API-Key <key>
```

Anonym ist alles gesperrt, nur `media` ist öffentlich lesbar.

## Produktion (Cutover, Plan 2)

Der `cms`-Container läuft hinter dem Reverse Proxy auf `cms.berliner-schnauze.wtf`. Vor dem öffentlichen Schalten den ersten Admin anlegen. Postgres sichert Portabase, das Media-Volume braucht ein eigenes Backup. Die genaue Reihenfolge steht im Plan `docs/superpowers/plans/2026-10-16-payload-backend.md` (Task 8) und in der Spec.
