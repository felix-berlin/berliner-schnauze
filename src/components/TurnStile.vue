<template>
  <div
    :id="wrapperId"
    class="c-turnstile"
  />
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $isDarkMode } from "@stores/index.ts";
import { onMounted } from "vue";

interface TurnStileProps {
  siteKey: string;
  wrapperId?: string;
}

const { siteKey, wrapperId = "turnstileWrapper" } = defineProps<TurnStileProps>();

const isDarkMode = useStore($isDarkMode);

const emit = defineEmits<{
  expire: [expired: boolean];
  fail: [error: boolean];
  verify: [response: boolean];
}>();

/**
 * Create the turnstile script tag
 *
 * @return  {void}
 */
const createTurnstileScriptTag = (): void => {
  if (!(window.turnstile === null || !window.turnstile)) {
    return;
  }
  const script = document.createElement("script");
  script.src =
    "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback";
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
};

/**
 * Render the turnstile
 *
 * @return  {void}  [return description]
 */
const renderTurnstile = (): void => {
  window.onloadTurnstileCallback = function () {
    turnstile.render(`#${wrapperId}`, {
      callback: (response: string) => emit("verify", checkVerification(response)),
      "error-callback": emit("fail", true),
      "expired-callback": emit("expire", true),
      sitekey: siteKey,
      theme: isDarkMode ? "dark" : "light",
    });
  };
};

/**
 * Check if the response is valid
 *
 * @param   {string}   response
 *
 * @return  {boolean}
 */
const checkVerification = (response: string): boolean => {
  return response !== null && response !== "";
};

onMounted(() => {
  createTurnstileScriptTag();
  renderTurnstile();
});
</script>

<style scoped></style>
