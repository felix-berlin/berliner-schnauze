<template>
  <form class="c-comment-form" novalidate @submit.prevent="onSubmit">
    <div class="c-comment-form__row">
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
      <div class="c-comment-form__under">
        <span v-if="error" :id="`${uid}-error`" class="c-comment-form__error">{{ error }}</span>
        <span
          class="c-comment-form__counter t-small"
          :class="{ 'is-over': over }"
          :aria-live="text.length >= LIVE_FROM ? 'polite' : undefined"
          >{{ text.length }} / {{ COMMENT_MAX }}</span
        >
      </div>
    </div>
    <div v-if="showName" class="c-comment-form__row">
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
      <span :id="`${uid}-name-hint`" class="c-comment-form__hint t-small">
        Leer jelassen? Dann kriegste ’n Berliner Namen, z. B. „Anonyme Schrippe“.
      </span>
    </div>
    <div v-if="failed" class="c-state c-state--error" role="alert">
      <CircleAlert aria-hidden="true" height="18" width="18" />
      <span class="c-state__body">
        <b>Ditt hat nich jeklappt.</b>
        <span>
          Dein Kommentar is nich rausjegangen. Dein Text bleibt stehen – versuch’s gleich nochmal.
        </span>
      </span>
    </div>
    <p v-if="!online" :id="`${uid}-offline`" class="c-comment-form__hint t-small">
      Du bist offline. Abschicken jeht wieder, sobald du Netz hast.
    </p>
    <div class="c-comment-form__actions">
      <button
        class="c-button c-button--primary c-comment-form__button"
        type="submit"
        :aria-busy="sending"
        :aria-disabled="sending || !online"
        :aria-describedby="online ? undefined : `${uid}-offline`"
      >
        {{ failed ? "Nochmal abschicken" : "Abschicken" }}
      </button>
      <button v-if="cancellable" class="c-link" type="button" @click="emit('cancel')">
        Abbrechen
      </button>
      <span class="c-shortcut c-comment-form__kbd" aria-hidden="true">
        <kbd class="c-shortcut__key">{{ modKey }}</kbd>
        <kbd class="c-shortcut__key">Enter</kbd>
        <span class="c-shortcut__text">zum Abschicken</span>
      </span>
    </div>
    <p class="c-comment-form__privacy t-small">
      Dein Kommentar wird öffentlich angezeigt. Was wir dabei speichern, steht in der
      <a class="c-textlink c-textlink--inline" href="/datenschutz#5-kommentare-abstimmungen-und-meldungen"
        >Datenschutzerklärung</a
      >.
    </p>
  </form>
</template>

<script setup lang="ts">
import { useOnline } from "@vueuse/core";
import { COMMENT_MAX, COMMENT_MIN, NAME_MAX } from "payload-app/comments";
import { computed, onMounted, ref, useId, useTemplateRef, watch } from "vue";
import CircleAlert from "virtual:icons/lucide/circle-alert";

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
  focusOnMount = false,
  initialText = "",
  label = "Dein Kommentar",
  showName = true,
  submit,
} = defineProps<{
  cancellable?: boolean;
  /** Puts the focus into the textarea when the form opens. */
  focusOnMount?: boolean;
  initialText?: string;
  label?: string;
  showName?: boolean;
  /** Resolves true when the text was stored (the form clears), false to keep the input. */
  submit: (value: { authorName: string; text: string }) => Promise<boolean>;
}>();

const emit = defineEmits<{ cancel: [] }>();

const uid = useId();
const authorName = ref("");
const text = ref(initialText);
const sending = ref(false);
// The send failed: the text stays and the button reads „Nochmal abschicken“.
const failed = ref(false);
// Shown after a refused submit (button stays enabled, so the reason is never hidden behind it).
const error = ref("");
const area = useTemplateRef<HTMLTextAreaElement>("area");

const over = computed(() => text.value.length > COMMENT_MAX);
// Same minimum as the server (`COMMENT_MIN`); the error deliberately doesn't name it.
const ready = computed(() => text.value.trim().length >= COMMENT_MIN && !over.value);

watch(text, () => {
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
  sending.value = true;
  const ok = await submit({ authorName: authorName.value.trim(), text: text.value.trim() });
  sending.value = false;
  failed.value = !ok;
  if (ok) text.value = "";
};
</script>

<style lang="scss">
@use "@styles/components/shortcut";
@use "@styles/components/comment-form";
</style>
