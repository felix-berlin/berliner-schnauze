import * as Sentry from "@sentry/browser";
import { version } from "../../package.json";

Sentry.init({
  dsn: import.meta.env.PUBLIC_SENTRY_DNS,

  environment: import.meta.env.PUBLIC_SENTRY_ENVIRONMENT,

  // Alternatively, use `process.env.npm_package_version` for a dynamic release version
  // if your build tool supports it.
  release: version,
  integrations: [Sentry.browserTracingIntegration({ enableInp: true }), Sentry.replayIntegration()],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: Number(import.meta.env.PUBLIC_SENTRY_TRACES_SAMPLE_RATE),

  // Set `tracePropagationTargets` to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ["localhost", /^https:\/\/berliner-schnauze\.wtf/],

  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
