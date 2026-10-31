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
        placeholder="Anonymer Berliner"
      />
    </div>
    <div class="c-comment-form__row">
      <label class="c-label" :for="`${uid}-text`">{{ label }}</label>
      <textarea :id="`${uid}-text`" v-model="text" class="c-textarea" rows="3" />
      <span class="c-comment-form__counter" :class="{ 'is-over': over }" aria-live="polite"
        >{{ text.length }} / {{ COMMENT_MAX }}</span
      >
    </div>
    <p class="c-comment-form__privacy">
      Mit dem Abschicken wird dein Kommentar öffentlich angezeigt. Was wir dabei speichern, steht in
      der <a href="/datenschutz#kommentare">Datenschutzerklärung</a>.
    </p>
    <div class="c-comment-form__actions">
      <button class="c-button c-button--primary" type="submit" :disabled="!ready || sending">
        Abschicken
      </button>
      <button v-if="cancellable" class="c-button" type="button" @click="emit('cancel')">
        Abbrechen
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { COMMENT_MAX, NAME_MAX } from "payload-app/comments";
import { computed, ref, useId } from "vue";

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

const over = computed(() => text.value.length > COMMENT_MAX);
// The server wants at least 2 characters (commentSchema)
const ready = computed(() => text.value.trim().length >= 2 && !over.value);

const onSubmit = async (): Promise<void> => {
  if (!ready.value || sending.value) return;
  sending.value = true;
  const ok = await submit({ authorName: authorName.value.trim(), text: text.value.trim() });
  sending.value = false;
  if (ok) text.value = "";
};
</script>

<style lang="scss">
@use "@styles/components/comment-form";
</style>
