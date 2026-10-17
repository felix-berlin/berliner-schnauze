# Infisical with Docker Compose

Both application images can fetch runtime secrets from Infisical when their
containers start. The entrypoint uses Universal Auth to obtain a short-lived
token, then starts the app through `infisical sm run`. The Infisical CLI is
version-pinned and checksum-verified in each image; credentials are runtime
environment variables and are not baked into the images.
The release workflow publishes both images as multi-platform manifests for
`linux/amd64` and `linux/arm64`; Compose selects the matching image for the host.

## Configure Infisical

1. Create a machine identity for `web` and a separate one for `cms` in the
   Infisical project.
2. Give each identity read access only to the environment and secrets it needs.
   Create a Universal Auth client secret for each identity.
3. Add the runtime variables currently used by the application to the selected
   Infisical environment. In particular, `DATABASE_URL`, `PAYLOAD_SECRET`, and
   `PAYLOAD_SERVER_URL` are required by the app at runtime. `DATABASE_URL` must
   use `postgres` as its hostname inside Compose.

## Configure Komodo

Set these non-secret Stack environment values:

```dotenv
INFISICAL_ENABLED=true
INFISICAL_PROJECT_ID=<Infisical project ID>
INFISICAL_ENV=prod
INFISICAL_DOMAIN=https://app.infisical.com
```

Create these as **secret** variables in Komodo's Settings → Variables:

```dotenv
WEB_CLIENT_ID=<web machine identity client ID>
WEB_CLIENT_SECRET=<web machine identity client secret>
CMS_CLIENT_ID=<cms machine identity client ID>
CMS_CLIENT_SECRET=<cms machine identity client secret>
```

Reference them in the Stack's Environment, which Komodo writes to the Compose
`.env` file:

```dotenv
INFISICAL_ENABLED=true
INFISICAL_PROJECT_ID=<Infisical project ID>
INFISICAL_ENV=prod
INFISICAL_DOMAIN=https://app.infisical.com
INFISICAL_WEB_CLIENT_ID=[[WEB_CLIENT_ID]]
INFISICAL_WEB_CLIENT_SECRET=[[WEB_CLIENT_SECRET]]
INFISICAL_CMS_CLIENT_ID=[[CMS_CLIENT_ID]]
INFISICAL_CMS_CLIENT_SECRET=[[CMS_CLIENT_SECRET]]
APP_RUNTIME_ENV_FILE=/dev/null
POSTGRES_USER=berliner
POSTGRES_PASSWORD=[[POSTGRES_PASSWORD]]
POSTGRES_DB=berliner_schnauze
```

Create `POSTGRES_PASSWORD` as a separate Komodo secret too. These values must
be present in Komodo's Stack Environment because Compose resolves them before
it starts the containers. `APP_RUNTIME_ENV_FILE=/dev/null` prevents Compose
from passing the Stack `.env` file (including both client credentials) into
each app container. The app images receive only the identity assigned to that
service.

Use `INFISICAL_ENV=dev` for local development. For EU Cloud, use
`https://eu.infisical.com`; for self-hosted Infisical, use its base URL.

Keep `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` available to
Compose: the Postgres container needs them before either application starts.
With Infisical enabled, the application services get their runtime environment
from Infisical. With it disabled (the default), the optional root `.env` file
continues to provide the local runtime environment. Do not set
`APP_RUNTIME_ENV_FILE=/dev/null` for local runs that rely on `.env`.

Infisical login or secret-fetch failures stop the affected app container rather
than starting it with missing secrets.
