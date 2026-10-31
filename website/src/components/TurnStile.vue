<template>
  <div :id="wrapperId" class="c-turnstile" />
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $isDarkMode } from "@stores/darkMode.ts";
import { onMounted } from "vue";

interface TurnStileProps {
  siteKey: string;
  wrapperId?: string;
  /** "interaction-only" shows the widget only when Turnstile needs a user interaction. */
  appearance?: "always" | "interaction-only";
}

const {
  siteKey,
  wrapperId = "turnstileWrapper",
  appearance = "always",
} = defineProps<TurnStileProps>();

const isDarkMode = useStore($isDarkMode);

// The current token; "" once it expired or the challenge failed, so a stale token is never sent.
const emit = defineEmits<{ token: [token: string] }>();

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback";

// Id of this widget, so reset() targets it and not another widget on the page.
let widgetId: string | undefined;

const render = (): void => {
  widgetId = window.turnstile?.render(`#${wrapperId}`, {
    appearance,
    callback: (token) => emit("token", token),
    "error-callback": () => emit("token", ""),
    "expired-callback": () => emit("token", ""),
    sitekey: siteKey,
    theme: isDarkMode.value ? "dark" : "light",
  });
};

/** Issues a fresh token for the next action (e.g. another comment post); clears the current one. */
const reset = (): void => {
  if (widgetId !== undefined) window.turnstile?.reset(widgetId);
  emit("token", "");
};

defineExpose({ reset });

onMounted(() => {
  // Already loaded (e.g. a second visit via view transition): the onload callback will not fire again.
  if (window.turnstile) return render();
  window.onloadTurnstileCallback = render;
  if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return;
  const script = document.createElement("script");
  script.src = SCRIPT_SRC;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
});
</script>
