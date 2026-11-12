<template>
  <p v-if="!editing" class="c-bon-name">
    <!-- Trailing space keeps the text readable as one sentence outside the flex layout. -->
    <span class="c-bon-name__label">{{ "Du spielst als " }}</span>
    <b class="c-bon-name__name">{{ shown.name }}</b>
    <span v-if="shown.name === 'Anonym' && shown.tag" class="c-bon-name__tag"
      >#{{ shown.tag }}</span
    >
    <span v-if="justSaved" class="c-bon-name__ok" role="status">
      <CheckIcon aria-hidden="true" height="14" width="14" />Jespeichert
    </span>
    <button
      ref="link"
      class="c-textlink c-textlink--inline c-bon-name__link"
      type="button"
      aria-expanded="false"
      @click="edit"
    >
      Namen ändern
    </button>
  </p>

  <div v-else class="c-bon-name__edit" role="group" aria-labelledby="bon-name-label">
    <span class="c-bon-name__head">
      <label id="bon-name-label" for="bon-name-input" class="c-bon-name__field-label">
        Dein Name
      </label>
      <span class="t-small" aria-live="polite">{{ draft.length }} / 24</span>
    </span>
    <input
      id="bon-name-input"
      ref="input"
      v-model="draft"
      class="c-input c-bon-name__input"
      type="text"
      maxlength="24"
      autocomplete="nickname"
      placeholder="Anonym"
      :disabled="saving"
      :aria-invalid="error === 'rejected' || error === 'far-right'"
      aria-describedby="bon-name-hint bon-name-error"
      @input="error = undefined"
      @keydown.enter.prevent="save"
      @keydown.esc="close"
    />
    <span id="bon-name-hint" class="t-small">
      Gilt ooch für deine bisherigen Ergebnisse in der Rangliste. Leer jelassen = „Anonym{{
        shown.tag ? ` #${shown.tag}` : ""
      }}“.
    </span>
    <div id="bon-name-error" aria-live="assertive">
      <div v-if="error" class="c-state c-state--error" role="alert">
        <AlertIcon aria-hidden="true" height="18" width="18" />
        <span class="c-state__body">
          <b>{{ texts[error][0] }}</b>
          <span v-if="texts[error][1]">{{ texts[error][1] }}</span>
          <a
            v-if="error === 'far-right'"
            class="c-textlink c-bon-name__exit"
            href="https://www.exit-deutschland.de/"
            target="_blank"
            rel="noopener noreferrer"
            >EXIT-Deutschland</a
          >
        </span>
      </div>
    </div>
    <span class="c-bon-name__actions">
      <button class="c-choice" type="button" aria-pressed="true" :aria-busy="saving" @click="save">
        {{ error === "net" ? "Nochmal speichern" : "Speichern" }}
      </button>
      <button class="c-textlink c-bon-name__link" type="button" @click="close">Abbrechen</button>
    </span>
  </div>
</template>

<script setup lang="ts">
import { renamePlayer, rememberName, type PlayerName } from "@services/bonPlayerApi.ts";
import { ANONYM, nameCategory } from "payload-app/bon-names";
import CheckIcon from "virtual:icons/lucide/check";
import AlertIcon from "virtual:icons/lucide/circle-alert";
import { nextTick, onBeforeUnmount, ref, watch } from "vue";

const props = defineProps<PlayerName>();
const emit = defineEmits<{ saved: [PlayerName] }>();

type Problem = "rejected" | "far-right" | "limit" | "net";
const texts: Record<Problem, [string, string?]> = {
  "far-right": [
    "Rechtsextreme Namen jibt’s hier nich.",
    "Willst du raus aus der rechten Szene? Such dir Hilfe:",
  ],
  limit: ["Heute jenug umjetauft – morjen wieder."],
  net: ["Ditt hat nich jeklappt.", "Dein Name is nich anjekommen. Versuch’s gleich nochmal."],
  rejected: [
    "Der Name jeht so nich.",
    "Bitte keene Beleidigungen oder Schimpfwörter – versuch’s mit ’nem andern.",
  ],
};

const shown = ref<PlayerName>({ name: props.name, tag: props.tag });
watch(
  () => [props.name, props.tag],
  () => (shown.value = { name: props.name, tag: props.tag }),
);

const editing = ref(false);
const draft = ref("");
const saving = ref(false);
const error = ref<Problem>();
const justSaved = ref(false);
const input = ref<HTMLInputElement>();
const link = ref<HTMLButtonElement>();
let timer: ReturnType<typeof setTimeout> | undefined;

async function edit() {
  draft.value = shown.value.name === ANONYM ? "" : shown.value.name;
  error.value = undefined;
  justSaved.value = false;
  editing.value = true;
  await nextTick();
  input.value?.focus();
  input.value?.select();
}

async function close() {
  if (saving.value) return;
  editing.value = false;
  await nextTick();
  link.value?.focus();
}

async function save() {
  if (saving.value) return; // one PATCH in flight
  saving.value = true;
  error.value = undefined;
  try {
    const reply = await renamePlayer(draft.value);
    shown.value = reply;
    rememberName(reply.name);
    emit("saved", reply);
    saving.value = false;
    editing.value = false;
    justSaved.value = true;
    clearTimeout(timer);
    timer = setTimeout(() => (justSaved.value = false), 3000);
    await nextTick();
    link.value?.focus();
  } catch (e) {
    const status = (e as { status?: number }).status;
    // The server only says 422; the same filter tells a far-right name apart for the exit hint (as on the intro).
    error.value =
      status === 422
        ? nameCategory(draft.value.trim()) === "far-right"
          ? "far-right"
          : "rejected"
        : status === 429
          ? "limit"
          : "net";
    saving.value = false;
    await nextTick();
    input.value?.focus();
  }
}

onBeforeUnmount(() => clearTimeout(timer));
</script>

<style lang="scss">
@use "@styles/components/bon-name";
</style>
