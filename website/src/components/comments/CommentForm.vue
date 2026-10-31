<template>
  <form class="c-comment-form" novalidate @submit.prevent="onSubmit">
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
      <span :id="`${uid}-name-hint`" class="c-comment-form__hint">
        Leer jelassen? Dann kriegste 'n Berliner Namen, z. B. „Anonyme Schrippe“.
      </span>
    </div>
    <div class="c-comment-form__row">
      <label class="c-label" :for="`${uid}-text`">{{ label }}</label>
      <textarea
        :id="`${uid}-text`"
        ref="area"
        v-model="text"
        class="c-textarea"
        rows="3"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="error ? `${uid}-error` : undefined"
        @keydown.enter.ctrl.exact.prevent="onSubmit"
        @keydown.enter.meta.exact.prevent="onSubmit"
      />
      <div class="c-comment-form__under">
        <span v-if="error" :id="`${uid}-error`" class="c-comment-form__error">{{ error }}</span>
        <span class="c-comment-form__counter" :class="{ 'is-over': over }"
          >{{ text.length }} / {{ COMMENT_MAX }}</span
        >
      </div>
      <span class="u-sr-only" role="status">{{ announce }}</span>
    </div>
    <p class="c-comment-form__privacy">
      Mit dem Abschicken wird dein Kommentar öffentlich angezeigt. Was wir dabei speichern, steht in
      der <a href="/datenschutz#kommentare">Datenschutzerklärung</a>.
    </p>
    <div class="c-comment-form__actions">
      <button
        class="c-button c-button--primary c-comment-form__button"
        type="submit"
        :disabled="sending"
        :aria-busy="sending"
      >
        {{ sending ? "Wird jeschickt …" : "Abschicken" }}
      </button>
      <button
        v-if="cancellable"
        class="c-button c-comment-form__button"
        type="button"
        @click="emit('cancel')"
      >
        Abbrechen
      </button>
      <span class="c-shortcut c-comment-form__kbd" aria-hidden="true">
        <kbd class="c-shortcut__key">{{ modKey }}</kbd>
        <kbd class="c-shortcut__key">Enter</kbd>
        <span class="c-shortcut__text">zum Abschicken</span>
      </span>
    </div>
  </form>
</template>

<script setup lang="ts">
import { COMMENT_MAX, COMMENT_MIN, NAME_MAX } from "payload-app/comments";
import { computed, onMounted, ref, useId, useTemplateRef, watch } from "vue";

// Set after mount so the server render and hydration agree (both say „Strg“).
const modKey = ref("Strg");
onMounted(() => {
  if (/Mac|iP(hone|ad)/.test(navigator.userAgent)) modKey.value = "⌘";
});

const {
  cancellable = false,
  initialText = "",
  label = "Dein Kommentar",
  showName = true,
  submit,
} = defineProps<{
  cancellable?: boolean;
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
// Shown after a refused submit (button stays enabled, so the reason is never hidden behind it).
const error = ref("");
const area = useTemplateRef<HTMLTextAreaElement>("area");

// Announced to screen readers only near or over the limit, not on every keystroke.
const announce = computed(() =>
  over.value
    ? `${text.value.length - COMMENT_MAX} Zeichen zu viel`
    : text.value.length >= COMMENT_MAX - 50
      ? `Noch ${COMMENT_MAX - text.value.length} Zeichen`
      : "",
);
const over = computed(() => text.value.length > COMMENT_MAX);
// Same minimum as the server (`COMMENT_MIN`); the error deliberately doesn't name it.
const ready = computed(() => text.value.trim().length >= COMMENT_MIN && !over.value);

watch(text, () => {
  if (error.value && ready.value) error.value = "";
});

const onSubmit = async (): Promise<void> => {
  if (sending.value) return;
  if (!ready.value) {
    error.value = over.value
      ? `Dit is zu lang: höchstens ${COMMENT_MAX} Zeichen.`
      : "Bisken mehr musste schon schreiben.";
    area.value?.focus();
    return;
  }
  error.value = "";
  sending.value = true;
  const ok = await submit({ authorName: authorName.value.trim(), text: text.value.trim() });
  sending.value = false;
  if (ok) text.value = "";
};
</script>

<style lang="scss">
@use "@styles/components/shortcut";
@use "@styles/components/comment-form";
</style>
