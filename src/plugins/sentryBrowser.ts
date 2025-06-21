import * as Sentry from "@sentry/browser";
import { SENTRY_DNS, SENTRY_ENVIRONMENT, SENTRY_TRACES_SAMPLE_RATE } from "astro:env/client";

import { version } from "../../package.json";

Sentry.init({
  dsn: SENTRY_DNS,

  environment: SENTRY_ENVIRONMENT,

  integrations: [Sentry.browserTracingIntegration({ enableInp: true }), Sentry.replayIntegration()],
  // Alternatively, use `process.env.npm_package_version` for a dynamic release version
  // if your build tool supports it.
  release: version,

  replaysOnErrorSampleRate: 1.0,

  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,

  // Set `tracePropagationTargets` to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ["localhost", /^https:\/\/berliner-schnauze\.wtf/],
  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: Number(SENTRY_TRACES_SAMPLE_RATE),
});
