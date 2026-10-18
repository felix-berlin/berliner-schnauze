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
}

const { siteKey, wrapperId = "turnstileWrapper" } = defineProps<TurnStileProps>();

const isDarkMode = useStore($isDarkMode);

// The current token; "" once it expired or the challenge failed, so a stale token is never sent.
const emit = defineEmits<{ token: [token: string] }>();

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback";

const render = (): void => {
  window.turnstile?.render(`#${wrapperId}`, {
    callback: (token) => emit("token", token),
    "error-callback": () => emit("token", ""),
    "expired-callback": () => emit("token", ""),
    sitekey: siteKey,
    theme: isDarkMode.value ? "dark" : "light",
  });
};

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
