<template>
  <form
    ref="root"
    class="c-suggest-word-form c-form"
    novalidate
    data-track-content
    data-content-name="Word Suggest Form"
    data-content-piece="Wort einreichen"
    data-content-target="/wort-vorschlagen"
    @submit.prevent="onSubmit"
  >
    <div v-for="(group, groupIndex) in FIELD_GROUPS" :key="groupIndex" class="c-form__group">
      <div
        v-for="field in group"
        :key="field.name"
        class="c-form__item is-vertical"
        :class="{ [field.textarea ? 'c-textarea--error' : 'has-error']: errors[field.name] }"
      >
        <label
          class="c-form__label c-label"
          :class="{ 'is-required': field.required }"
          :for="field.id"
          >{{ field.label }}</label
        >
        <div class="c-floating-label">
          <textarea
            v-if="field.textarea"
            :id="field.id"
            v-model="form[field.name]"
            class="c-textarea c-floating-label__input"
            :name="field.id"
            rows="4"
            placeholder=" "
          />
          <input
            v-else
            :id="field.id"
            v-model="form[field.name]"
            class="c-input c-form__input c-floating-label__input"
            :class="{ 'c-input--email': field.type === 'email' }"
            :type="field.type ?? 'text'"
            :name="field.id"
            placeholder=" "
            :required="field.required"
          />
          <AlertBanner
            v-if="errors[field.name]"
            type="danger"
            class="c-floating-label__label c-floating-label__label--bottom c-alert--small"
          >
            {{ errors[field.name] }}
          </AlertBanner>
        </div>
      </div>
    </div>

    <button
      class="c-button c-suggest-word-form__button"
      type="submit"
      :disabled="isSending"
      data-content-ignoreinteraction
    >
      <Transition name="fade" mode="out-in">
        <span v-if="!isSending">Wort einreichen</span>
        <span v-else>Wort wird gesendet</span>
      </Transition>
    </button>

    <TurnStile :site-key="TURNSTILE_SITE_KEY" @token="turnstileToken = $event" />
  </form>
</template>

<script setup lang="ts">
import TurnStile from "@components/TurnStile.vue";
import { useContentTracking } from "@composables/useContentTracking";
import { createToastNotify } from "@stores/toastNotify.ts";
import { trackEvent } from "@utils/analytics";
import { type SuggestWord, suggestWordSchema } from "@utils/suggestWordSchema.ts";
import { useTimeoutFn } from "@vueuse/core";
import { TURNSTILE_SITE_KEY } from "astro:env/client";
import { defineAsyncComponent, reactive, ref } from "vue";
import { z } from "zod";

const AlertBanner = defineAsyncComponent(() => import("@components/AlertBanner.vue"));

const { berlinerWord = "" } = defineProps<{ berlinerWord?: string }>();

type FieldName = keyof SuggestWord;

type Field = {
  id: string;
  label: string;
  name: FieldName;
  required?: boolean;
  textarea?: boolean;
  type?: "email";
};

// One inner array per c-form__group row; fields in a row sit side by side from md up.
const FIELD_GROUPS: Field[][] = [
  [
    { id: "berlinerWort", label: "Berliner Wort", name: "berlinerWord", required: true },
    {
      id: "translation",
      label: "Übersetzung in Hochdeutsche",
      name: "translation",
      required: true,
    },
  ],
  [{ id: "example", label: "Schreibe einen Beispielsatz:", name: "example", textarea: true }],
  [
    { id: "userName", label: "Dein Name (optional)", name: "userName" },
    { id: "userEmail", label: "Deine E-Mailadresse (optional)", name: "userMail", type: "email" },
  ],
];

const emptyForm = (): SuggestWord => ({
  berlinerWord: "",
  example: "",
  translation: "",
  userMail: "",
  userName: "",
});

const form = reactive<SuggestWord>({ ...emptyForm(), berlinerWord });
const errors = ref<Partial<Record<FieldName, string>>>({});
// The token is checked by the server; a token works once, so the widget is reset after every send.
const turnstileToken = ref("");
const isSending = ref(false);

const root = ref<HTMLFormElement | null>(null);
useContentTracking(root);

// Keep the sent values visible for a moment before clearing the form.
const { start: scheduleReset } = useTimeoutFn(() => Object.assign(form, emptyForm()), 3000, {
  immediate: false,
});

const onSubmit = async (): Promise<void> => {
  const result = suggestWordSchema.safeParse(form);
  if (!result.success) {
    const { fieldErrors } = z.flattenError(result.error);
    errors.value = Object.fromEntries(
      Object.entries(fieldErrors).map(([name, messages]) => [name, messages?.[0]]),
    );
    return;
  }
  errors.value = {};
  if (!turnstileToken.value || isSending.value) return;

  isSending.value = true;
  const sent = await fetch("/api/suggest-word", {
    body: JSON.stringify({ ...result.data, turnstileToken: turnstileToken.value }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })
    .then((res) => res.ok)
    .catch(() => false);
  isSending.value = false;
  turnstileToken.value = "";
  window.turnstile?.reset();

  if (!sent) {
    createToastNotify({
      message: "Unbekannter Fehler, Dein Wort konnte leider nicht gesendet werden.",
      status: "error",
      timeout: null,
    });
    return;
  }

  createToastNotify({ message: "Dein Wortvorschlag wurde versandt", status: "success" });
  trackEvent("Form", "Send", "Word Suggestion");
  scheduleReset();
};
</script>

<style lang="scss">
@use "@styles/components/floating-label";
@use "@styles/components/form";
@use "@styles/components/suggest-word-form";
</style>
