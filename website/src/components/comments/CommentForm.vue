<template>
  <form class="c-comment-form" novalidate @submit.prevent="onSubmit">
    <div class="row">
      <label class="c-label" :for="`${uid}-text`">{{ label }}</label>
      <textarea
        :id="`${uid}-text`"
        ref="area"
        v-model="text"
        class="c-textarea"
        rows="4"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="error ? `${uid}-error` : undefined"
        @keydown.enter.ctrl.exact.prevent="onSubmit"
        @keydown.enter.meta.exact.prevent="onSubmit"
      />
      <div class="under">
        <span v-if="error" :id="`${uid}-error`" class="error">{{ error }}</span>
        <span
          class="counter t-small"
          :data-state="over ? 'over' : undefined"
          :aria-live="text.length >= LIVE_FROM ? 'polite' : undefined"
          >{{ text.length }} / {{ COMMENT_MAX }}</span
        >
      </div>
    </div>
    <div v-if="showName" class="row">
      <label class="c-label" :for="`${uid}-name`">Dein Name (optional)</label>
      <input
        :id="`${uid}-name`"
        v-model="authorName"
        class="c-input"
        type="text"
        :maxlength="NAME_MAX"
        autocomplete="nickname"
        placeholder="z. B. Kiez-Kalle"
        :aria-describedby="`${uid}-name-hint`"
      />
      <span :id="`${uid}-name-hint`" class="hint t-small">
        Leer jelassen? Dann kriegste ’n Berliner Namen, z. B. „Anonyme Schrippe“.
      </span>
    </div>
    <div v-if="failed" class="c-state" data-variant="error" role="alert">
      <CircleAlert aria-hidden="true" height="18" width="18" />
      <span class="body">
        <b>Ditt hat nich jeklappt.</b>
        <span>
          Dein Kommentar is nich rausjegangen. Dein Text bleibt stehen – versuch’s gleich nochmal.
        </span>
        <span v-if="reason" class="detail">{{ reason }}</span>
      </span>
    </div>
    <!-- Nothing was sent (captcha still running): a calm status, not the error box. -->
    <div v-if="waiting" class="c-state" role="status">
      <Hourglass aria-hidden="true" height="18" width="18" />
      <span class="body">{{ waiting }}</span>
    </div>
    <p v-if="!online" :id="`${uid}-offline`" class="hint t-small">
      Du bist offline. Abschicken jeht wieder, sobald du Netz hast.
    </p>
    <div class="actions">
      <!-- Edit: "Speichern" is a pressed choice, the spec allows one primary per view (the new-comment button). -->
      <button
        :class="edit ? 'c-choice' : 'c-button'"
        :data-variant="edit ? undefined : 'primary'"
        type="submit"
        :aria-pressed="edit ? true : undefined"
        :aria-busy="sending"
        :aria-disabled="sending || !online"
        :aria-describedby="online ? undefined : `${uid}-offline`"
      >
        {{ edit ? "Speichern" : failed ? "Nochmal abschicken" : "Abschicken" }}
      </button>
      <button v-if="cancellable" class="c-link" type="button" @click="emit('cancel')">
        Abbrechen
      </button>
      <span v-if="!edit" class="kbd" aria-hidden="true">
        <kbd class="c-kbd">{{ modKey }}</kbd>
        <kbd class="c-kbd">Enter</kbd>
        zum Abschicken
      </span>
    </div>
    <p v-if="!edit" class="privacy t-small">
      Mit dem Abschicken wird dein Kommentar öffentlich angezeigt. Was wir dabei speichern, steht in
      der
      <a
        class="c-textlink"
        data-variant="inline"
        href="/datenschutz#5-kommentare-abstimmungen-und-meldungen"
        >Datenschutzerklärung</a
      >.
    </p>
  </form>
</template>

<script setup lang="ts">
/** true = stored, false = failed, {error} = failed with a reason, "wait"/"stuck" = nothing sent, captcha not ready. */
export type SubmitResult = { error: string } | "stuck" | "wait" | boolean;

import { captchaWaitToast } from "@utils/captchaToast.ts";
import { useOnline } from "@vueuse/core";
import { COMMENT_MAX, COMMENT_MIN, NAME_MAX } from "payload-app/comments";
import CircleAlert from "virtual:icons/lucide/circle-alert";
import Hourglass from "virtual:icons/lucide/hourglass";
import { computed, onMounted, ref, useId, useTemplateRef, watch } from "vue";

// The counter becomes a live region from here, so a screen reader hears the limit coming, not every keystroke.
const LIVE_FROM = 900;
const online = useOnline();

// Set after mount so the server render and hydration agree (both say „Strg“).
const modKey = ref("Strg");
onMounted(() => {
  if (/Mac|iP(hone|ad)/.test(navigator.userAgent)) modKey.value = "⌘";
  if (focusOnMount) area.value?.focus();
});

const {
  cancellable = false,
  captchaReady = true,
  edit = false,
  focusOnMount = false,
  initialText = "",
  label = "Dein Kommentar",
  showName = true,
  submit,
} = defineProps<{
  cancellable?: boolean;
  /** False while the captcha check still runs; a shown "wait" status clears once it turns true. */
  captchaReady?: boolean;
  /** Editing an own comment: "Speichern" as a pressed choice, no shortcut hint, no privacy line. */
  edit?: boolean;
  /** Puts the focus into the textarea when the form opens. */
  focusOnMount?: boolean;
  initialText?: string;
  label?: string;
  showName?: boolean;
  /** Resolves true when the text was stored (the form clears), false to keep the input. */
  submit: (value: { authorName: string; text: string }) => Promise<SubmitResult>;
}>();

const emit = defineEmits<{ cancel: [] }>();

const uid = useId();
const authorName = ref("");
const text = ref(initialText);
const sending = ref(false);
// The send failed: the text stays and the button reads „Nochmal abschicken“.
const failed = ref(false);
const reason = ref("");
// The captcha check is still running (or stuck): said once, here, instead of a toast.
const waiting = ref("");
// Shown after a refused submit (button stays enabled, so the reason is never hidden behind it).
const error = ref("");
const area = useTemplateRef<HTMLTextAreaElement>("area");

const over = computed(() => text.value.length > COMMENT_MAX);
// Same minimum as the server (`COMMENT_MIN`); the error deliberately doesn't name it.
const ready = computed(() => text.value.trim().length >= COMMENT_MIN && !over.value);

// The wait is over (token there) or the visitor keeps typing: the status has done its job.
watch(
  () => captchaReady,
  (ready) => {
    if (ready) waiting.value = "";
  },
);
watch(text, () => {
  waiting.value = "";
  if (error.value && ready.value) error.value = "";
});

const onSubmit = async (): Promise<void> => {
  // aria-disabled, not :disabled: the button keeps the focus while sending or offline.
  if (sending.value || !online.value) return;
  if (!ready.value) {
    error.value = over.value
      ? `Dit is zu lang: höchstens ${COMMENT_MAX} Zeichen.`
      : "Bisken mehr musste schon schreiben.";
    area.value?.focus();
    return;
  }
  error.value = "";
  failed.value = false;
  reason.value = "";
  waiting.value = "";
  sending.value = true;
  const result = await submit({ authorName: authorName.value.trim(), text: text.value.trim() });
  sending.value = false;
  if (result === "wait" || result === "stuck") {
    waiting.value = captchaWaitToast(result === "stuck").message;
    return;
  }
  failed.value = result !== true;
  reason.value = typeof result === "object" ? result.error : "";
  if (result === true) text.value = "";
};
</script>

<style lang="scss">
@use "@styles/components/comment-form";
@use "@styles/components/kbd";
</style>
