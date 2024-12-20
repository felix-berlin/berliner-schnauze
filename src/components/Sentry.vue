<script setup lang="ts">
import { createApp, onBeforeMount } from "vue";
import * as Sentry from "@sentry/vue";
import { SENTRY_DNS } from "astro:env/client";

const app = createApp({});

const sentryInit = () => {
  Sentry.init({
    app,
    dsn: SENTRY_DNS,
    integrations: [new Sentry.BrowserTracing()],

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,

    // Set `tracePropagationTargets` to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: ["localhost", /^https:\/\/berliner-schnauze\.wtf/],

    // Capture Replay for 10% of all sessions,
    // plus for 100% of sessions with an error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
};

onBeforeMount(() => {
  sentryInit();
});
</script>

<style scoped></style>
