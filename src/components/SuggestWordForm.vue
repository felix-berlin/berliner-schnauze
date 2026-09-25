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

    <TurnStile :site-key="TURNSTILE_SITE_KEY" @verify="isVerified = $event" />
  </form>
</template>

<script setup lang="ts">
import TurnStile from "@components/TurnStile.vue";
import { useContentTracking } from "@composables/useContentTracking";
import { createToastNotify } from "@stores/toastNotify.ts";
import { Client, fetchExchange } from "@urql/core";
import { trackEvent } from "@utils/analytics";
import { useTimeoutFn } from "@vueuse/core";
import { TURNSTILE_SITE_KEY, WP_API } from "astro:env/client";
import { defineAsyncComponent, reactive, ref } from "vue";
import { z } from "zod";

import { SendEmailDocument } from "@/gql/graphql.ts";

const AlertBanner = defineAsyncComponent(() => import("@components/AlertBanner.vue"));

const { berlinerWord = "" } = defineProps<{ berlinerWord?: string }>();

/** Required text: empty and one-letter answers get their own message. */
const required = (missing: string, tooShort: string) =>
  z.string().trim().min(1, missing).min(2, tooShort);
/** Optional text: empty is fine, a single letter is not. */
const optional = (tooShort: string) =>
  z
    .string()
    .trim()
    .refine((v) => v.length !== 1, tooShort);

const suggestWordSchema = z.object({
  berlinerWord: required(
    "Hey du hast ditt Wort vergessen.",
    "Oh, ditt is aber een sehr kurzes Wort",
  ),
  example: optional("Mehr is dir nicht eingefallen?"),
  translation: required(
    "Ohne die Übersetzung wird dett etwas schwierig.",
    "Ditt is aber ne kleene Übersetzung.",
  ),
  userMail: z.union([z.literal(""), z.email("Irgendwas läuft hier nicht")]),
  userName: optional("Du hast nen sehr kleinen Namen"),
});

type SuggestWord = z.infer<typeof suggestWordSchema>;
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
const isVerified = ref(false);
const isSending = ref(false);

const root = ref<HTMLFormElement | null>(null);
useContentTracking(root);

// A single fire-and-forget mutation: a plain client, no provide/inject or reactive state.
const client = new Client({ exchanges: [fetchExchange], url: WP_API });

// Keep the sent values visible for a moment before clearing the form.
const { start: scheduleReset } = useTimeoutFn(() => Object.assign(form, emptyForm()), 3000, {
  immediate: false,
});

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const mailBody = (data: SuggestWord) => {
  const rows: [string, string][] = [
    ["Berliner Wort", data.berlinerWord],
    ["Übersetzung", data.translation],
    ["Beispiel", data.example],
    ["Name", data.userName],
    ["E-Mail", data.userMail],
  ];
  return [
    "<p>Ein neues Berliner Wort wurde eingereicht:</p>",
    ...rows.map(([label, value]) => `<p>${label}: <strong>${escapeHtml(value)}</strong></p>`),
  ].join("\n");
};

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
  if (!isVerified.value || isSending.value) return;

  isSending.value = true;
  const { data, error } = await client
    .mutation(SendEmailDocument, {
      input: {
        body: mailBody(result.data),
        clientMutationId: "newSuggestedWord",
        // The site stays the sender (SPF); the suggester is only the reply target.
        replyTo: result.data.userMail || undefined,
        subject: "Wortvorschlag - Berliner Schnauze",
        to: "mail@berliner-schnauze.wtf",
      },
    })
    .toPromise();
  isSending.value = false;

  if (error || !data?.sendEmail?.sent) {
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
