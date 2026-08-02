<template>
  <form
    ref="root"
    class="c-word-feedback-form c-form"
    novalidate="true"
    data-track-content
    data-content-name="Word Feedback Form"
    :data-content-piece="isError ? 'Fehler melden' : 'Inhalt vorschlagen'"
    :data-content-target="wordPageUrl"
    @submit.prevent="checkForm"
  >
    <p v-if="berlinerWord" class="c-word-feedback-form__word-context">
      Bezieht sich auf: <strong>{{ berlinerWord }}</strong>
    </p>

    <div class="c-form__item is-vertical">
      <span class="c-form__label c-label">Worum geht's?</span>
      <div class="c-word-feedback-form__type-options">
        <label class="c-word-feedback-form__type-option">
          <input v-model="formData.type" type="radio" name="feedbackType" value="error" />
          Fehler melden
        </label>
        <label class="c-word-feedback-form__type-option">
          <input v-model="formData.type" type="radio" name="feedbackType" value="content" />
          Inhalt vorschlagen
        </label>
      </div>
    </div>

    <div
      class="c-form__item is-vertical"
      :class="{ 'c-textarea--error': formErrors.message?.length }"
    >
      <label class="c-label c-form__label is-required" for="message">
        {{ isError ? "Was stimmt nicht?" : "Was möchtest du ergänzen?" }}
      </label>
      <div class="c-floating-label">
        <textarea
          id="message"
          v-model="formData.message"
          class="c-textarea c-floating-label__input"
          name="message"
          rows="4"
          placeholder=" "
          required
        />
        <AlertBanner
          v-if="formErrors.message?.length"
          type="danger"
          class="c-floating-label__label c-floating-label__label--bottom c-alert--small"
        >
          {{ formErrors.message }}
        </AlertBanner>
      </div>
    </div>

    <div class="c-form__group">
      <div class="c-form__item is-vertical" :class="{ 'has-error': formErrors.name?.length }">
        <label class="c-label c-form__label" for="userName">Dein Name (optional)</label>
        <div class="c-floating-label">
          <input
            id="userName"
            v-model="formData.userName"
            class="c-input c-form__input c-floating-label__input"
            type="text"
            name="userName"
            placeholder=" "
          />
          <AlertBanner
            v-if="formErrors.name.length"
            type="danger"
            class="c-floating-label__label c-floating-label__label--bottom c-alert--small"
          >
            {{ formErrors.name }}
          </AlertBanner>
        </div>
      </div>

      <div class="c-form__item is-vertical" :class="{ 'has-error': formErrors.eMail?.length }">
        <label class="c-label c-form__label" for="userEmail">Deine E-Mailadresse (optional)</label>
        <div class="c-floating-label">
          <input
            id="userEmail"
            v-model="formData.userMail"
            class="c-input c-form__input c-input--email c-floating-label__input"
            type="email"
            name="userEmail"
            placeholder=" "
          />
          <AlertBanner
            v-if="formErrors.eMail?.length"
            type="danger"
            class="c-floating-label__label c-floating-label__label--bottom c-alert--small"
          >
            {{ formErrors.eMail }}
          </AlertBanner>
        </div>
      </div>
    </div>

    <button
      class="c-button c-word-feedback-form__button"
      type="submit"
      data-content-ignoreinteraction
    >
      <Transition name="fade" mode="out-in">
        <span v-if="!isSending">{{ isError ? "Fehler melden" : "Vorschlag senden" }}</span>
        <span v-else>{{ isError ? "Wird gemeldet" : "Wird gesendet" }}</span>
      </Transition>
    </button>

    <TurnStile :site-key="turnstileSiteKey" @verify="isVerified = $event" />
  </form>
</template>

<script setup lang="ts">
import TurnStile from "@components/TurnStile.vue";
import { useContentTracking } from "@composables/useContentTracking";
import { createToastNotify } from "@stores/toastNotify.ts";
import { useMutation } from "@urql/vue";
import { trackEvent } from "@utils/analytics";
import { routeToWord } from "@utils/helpers.ts";
import { SITE_URL, TURNSTILE_SITE_KEY } from "astro:env/client";
import { computed, defineAsyncComponent, reactive, ref } from "vue";

import { SendEmailDocument } from "@/gql/graphql.ts";

const AlertBanner = defineAsyncComponent(() => import("@components/AlertBanner.vue"));

const root = ref<HTMLFormElement | null>(null);
useContentTracking(root);

const props = withDefaults(
  defineProps<{
    berlinerWord?: string;
    slug?: string;
    type?: "content" | "error";
  }>(),
  {
    type: "error",
  },
);

export interface FormData {
  [key: string]: string | undefined; // This is the index signature
  message?: string;
  type: "content" | "error";
  userMail?: string;
  userName?: string;
}

const formData = reactive<FormData>({
  message: "",
  type: props.type,
  userMail: "",
  userName: "",
});

interface FormErrors {
  [key: string]: string; // This is the index signature
  eMail: string;
  message: string;
  name: string;
}

const formErrors = reactive<FormErrors>({
  eMail: "",
  message: "",
  name: "",
});

const turnstileSiteKey = TURNSTILE_SITE_KEY;
const isVerified = ref(false);
const isSending = ref(false);

const isError = computed(() => formData.type === "error");
const wordPageUrl = computed(() =>
  props.slug ? SITE_URL + routeToWord(props.slug) : undefined,
);

const sendMailMutation = useMutation(SendEmailDocument);

const sendMail = async () => {
  const wordName = props.berlinerWord ?? "unbekanntes Wort";
  const subject = isError.value
    ? `Fehlermeldung - ${wordName} - Berliner Schnauze`
    : `Inhaltsvorschlag - ${wordName} - Berliner Schnauze`;

  const createBody = `
  <p>${isError.value ? "Eine Fehlermeldung" : "Ein Inhaltsvorschlag"} wurde eingereicht für: <strong>${wordName}</strong></p>
  <p>Nachricht: <strong>${formData.message}</strong></p>
  <p>Wortseite: <a href="${wordPageUrl.value}">${wordPageUrl.value}</a></p>
  <p>Name: <strong>${formData.userName}</strong></p>
  <p>E-Mail: <strong>${formData.userMail}</strong></p>
`;

  await sendMailMutation
    .executeMutation({
      input: {
        body: createBody,
        clientMutationId: isError.value ? "wordErrorReport" : "wordContentSuggestion",
        from: formData.userMail,
        subject,
        to: "mail@berliner-schnauze.wtf",
      },
    })
    .then((response) => {
      const { data, error } = response;
      const sent = data?.sendEmail?.sent;

      if (sent) {
        createToastNotify({
          message: isError.value
            ? "Danke, deine Fehlermeldung wurde versandt"
            : "Danke, dein Inhaltsvorschlag wurde versandt",
          status: "success",
        });

        trackEvent("Form", "Send", isError.value ? "Word Error Report" : "Word Content Suggestion");

        isSending.value = false;
      }

      if (error || !sent) {
        createToastNotify({
          message: "Unbekannter Fehler, Deine Meldung konnte leider nicht gesendet werden.",
          status: "error",
          timeout: null,
        });
      }

      resetForm();
    });
};

/**
 * Resets the form after a successful submission, keeping the selected feedback type
 *
 * @return  {void}  [return description]
 */
const resetForm = (): void => {
  if (sendMailMutation.data?.value?.sendEmail?.sent) {
    setTimeout(() => {
      formData.message = "";
      formData.userName = "";
      formData.userMail = "";
      formData.type = props.type;
    }, 3000);
  }
};

/**
 * Validates the form
 *
 * @return  {void}     Submit form
 */
const checkForm = async (): Promise<void> => {
  for (const error in formErrors) {
    formErrors[error] = "";
  }

  if (!formData.message) {
    formErrors.message = "Wat denn nu? Du hast noch nüscht geschrieben.";
  } else if (formData.message.length <= 4) {
    formErrors.message = "Datt is uns n bisschen zu knapp, schreib mal 'n büschen mehr.";
  }

  if (formData.userName && formData.userName?.length <= 1) {
    formErrors.name = "Du hast nen sehr kleinen Namen";
  }

  // If an e-mail address is given, validate it
  if (formData?.userMail && formData?.userMail?.length > 0 && !validEmail(formData?.userMail)) {
    formErrors.eMail = "Irgendwas läuft hier nicht";
  }

  // If there are no errors and the user is verified, submit the form
  if (Object.values(formErrors).every((v) => v?.length === 0) && isVerified.value) {
    isSending.value = true;
    await sendMail();
  }
};

/**
 * Checks if its a real email address
 *
 * @param   {String}  email  E-Mail address
 *
 * @return  {Boolean}         If check passes return true
 */
const validEmail = (email: string): boolean => {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  return re.test(email);
};
</script>

<style lang="scss">
@use "@styles/components/floating-label";
@use "@styles/components/form";
@use "@styles/components/word-feedback-form";
</style>
