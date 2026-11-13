import * as Sentry from "@sentry/astro";
import { SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_TRACES_SAMPLE_RATE } from "astro:env/client";

import { version } from "../../package.json";

Sentry.init({
  // v10's unset sendDefaultPii was restrictive; keep that baseline under v11's dataCollection
  dataCollection: {
    cookies: false,
    databaseQueryData: false,
    genAI: { inputs: false, outputs: false },
    httpBodies: [],
    httpHeaders: false,
    urlQueryParams: false, // query strings carry the preview token (/api/preview?token=) and checkout_id
    userInfo: false,
  },

  dsn: SENTRY_DSN,

  environment: SENTRY_ENVIRONMENT,

  // Enable Tracing integration when moving to ssr, replay not realy needed for now
  // integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  release: version,

  replaysOnErrorSampleRate: 1.0,

  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,

  tracePropagationTargets: ["localhost", /^https:\/\/berliner-schnauze\.wtf/],
  tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
});
