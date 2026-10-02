<template>
  <section class="c-app-settings__card">
    <fieldset class="c-app-settings-updates">
      <legend class="c-app-settings__card-title c-app-settings-updates__legend">
        <component :is="RefreshCwIcon" class="c-app-settings__card-title-icon" />
        App-Updates
      </legend>
      <label v-for="mode in MODES" :key="mode.value" class="c-app-settings-updates__option">
        <input
          class="c-app-settings-updates__input"
          type="radio"
          name="app-update-mode"
          :checked="updateMode === mode.value"
          @change="selectMode(mode.value)"
        />
        <span class="c-app-settings-updates__text">
          <span class="c-app-settings-updates__label">{{ mode.label }}</span>
          <span class="c-app-settings-updates__hint">{{ mode.hint }}</span>
        </span>
      </label>
    </fieldset>
  </section>
</template>

<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $updateMode, type UpdateMode } from "@stores/pwaSettings.ts";
import { trackEvent } from "@utils/analytics";
import { defineAsyncComponent } from "vue";

const RefreshCwIcon = defineAsyncComponent(() => import("virtual:icons/lucide/refresh-cw"));

const MODES: { hint: string; label: string; value: UpdateMode }[] = [
  { hint: "Wir klopfen an, sobald was Neues da ist.", label: "Nachfragen", value: "prompt" },
  {
    hint: "Lädt beim nächsten Seitenwechsel neu – nie mittendrin.",
    label: "Automatisch",
    value: "auto",
  },
  {
    hint: "Keen Tamtam. Die neue Version wartet beim nächsten Öffnen.",
    label: "Beim nächsten Start",
    value: "next-start",
  },
];

const updateMode = useStore($updateMode);

function selectMode(mode: UpdateMode): void {
  $updateMode.set(mode);
  trackEvent("App", `Update mode: ${mode}`, "Settings");
}
</script>

<style lang="scss">
@use "@styles/components/app-settings-updates";
</style>
