<template>
  <div :id="wrapperId" class="c-turnstile" />
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $isDarkMode } from "@stores/darkMode.ts";
import { reportError } from "@utils/reportError.ts";
import { onMounted, onUnmounted } from "vue";

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

/**
 * `token`: the current token, or "" once it expired or the challenge failed, so a stale token is never sent.
 * `error`: the check cannot run (script blocked, bad site key, unsupported browser); waiting will not help.
 */
const emit = defineEmits<{ error: [code: string]; token: [token: string] }>();

const fail = (code: string): void => {
  emit("token", "");
  emit("error", code);
  reportError(new Error(`Turnstile failed: ${code}`));
};

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback";

// Id of this widget, so reset() targets it and not another widget on the page.
let widgetId: string | undefined;
// Unmounted before the script arrived (view transition): the chained onload callback must skip it.
let mounted = true;
onUnmounted(() => (mounted = false));

const render = (): void => {
  if (!mounted) return;
  if (!window.turnstile) return fail("api-missing");
  widgetId = window.turnstile.render(`#${wrapperId}`, {
    appearance,
    callback: (token) => emit("token", token),
    "error-callback": fail,
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
  // Chained, not replaced: a second widget mounting before the script loaded must not drop the first one.
  const previous = window.onloadTurnstileCallback;
  window.onloadTurnstileCallback = () => {
    previous?.();
    render();
  };
  let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
  if (!script) {
    script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }
  script.addEventListener("error", () => fail("script-blocked"), { once: true });
});
</script>
