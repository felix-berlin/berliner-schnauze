import * as Sentry from "@sentry/astro";
import { SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_TRACES_SAMPLE_RATE } from "astro:env/client";

import { version } from "./package.json";

// Same privacy baseline as the browser init (src/plugins/sentryInit.ts): no cookies, headers, bodies or user info.
Sentry.init({
  dataCollection: {
    cookies: false,
    databaseQueryData: false,
    genAI: { inputs: false, outputs: false },
    httpBodies: [],
    httpHeaders: false,
    urlQueryParams: true,
    userInfo: false,
  },
  dsn: SENTRY_DSN,
  environment: SENTRY_ENVIRONMENT,
  release: version,
  tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
});
