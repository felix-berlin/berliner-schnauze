<template>
  <form class="c-suggest-word-form c-form" novalidate="true" @submit.prevent="checkForm">
    <div class="c-form__group">
      <div
        class="c-form__item is-vertical"
        :class="{ 'has-error': formErrors.berlinerWord?.length }"
      >
        <label class="c-form__label c-label is-required" for="berlinerWort">Berliner Wort</label>
        <div class="c-floating-label">
          <input
            id="berlinerWort"
            v-model="formData.berlinerWord"
            class="c-input c-form__input c-floating-label__input"
            type="text"
            name="berlinerWort"
            placeholder=" "
            required
          />
          <AlertBanner
            v-if="formErrors.berlinerWord?.length"
            type="danger"
            class="c-floating-label__label c-floating-label__label--bottom c-alert--small"
          >
            {{ formErrors.berlinerWord }}
          </AlertBanner>
        </div>
      </div>

      <div
        class="c-form__item is-vertical"
        :class="{ 'has-error': formErrors.translation?.length }"
      >
        <label class="c-form__label c-label is-required" for="translation"
          >Übersetzung in Hochdeutsche</label
        >
        <div class="c-floating-label">
          <input
            id="translation"
            v-model="formData.translation"
            class="c-input c-form__input c-floating-label__input"
            type="text"
            name="translation"
            placeholder=" "
          />
          <AlertBanner
            v-if="formErrors.translation?.length"
            type="danger"
            class="c-floating-label__label c-floating-label__label--bottom c-alert--small"
          >
            {{ formErrors.translation }}
          </AlertBanner>
        </div>
      </div>
    </div>

    <div
      class="c-form__item is-vertical"
      :class="{ 'c-textarea--error': formErrors.example?.length }"
    >
      <label class="c-label c-form__label" for="example">Schreibe einen Beispielsatz:</label>
      <div class="c-floating-label">
        <textarea
          id="example"
          v-model="formData.example"
          class="c-textarea c-floating-label__input"
          name="example"
          rows="4"
          placeholder=" "
        />
        <AlertBanner
          v-if="formErrors.example?.length"
          type="danger"
          class="c-floating-label__label c-floating-label__label--bottom c-alert--small"
        >
          {{ formErrors.example }}
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

    <button class="c-button c-button--theme c-suggest-word-form__button" type="submit">
      <!-- <Transition name="fade" mode="out-in"> -->
      <div
        v-if="formResponse.status === 'mail_sent'"
        key="success"
        class="c-suggest-word-form__message c-alert c-alert--success"
      >
        <span class="c-suggest-word-form__success-icon"><CheckCircle2 /></span
        ><span>{{ formResponse.message }}</span>
      </div>
      <div
        v-if="formResponse.status !== 'mail_sent' && formResponse.status?.length"
        key="success"
        class="c-suggest-word-form__message c-alert c-alert--danger"
      >
        <span class="c-suggest-word-form__success-icon"><AlertCircle /></span
        ><span>{{ formResponse.message }}</span>
      </div>
      <span v-else key="button-text">Wort einreichen</span>
      <!-- </Transition> -->
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import CheckCircle2 from "virtual:icons/lucide/check-circle-2";
import AlertCircle from "virtual:icons/lucide/alert-circle";
import AlertBanner from "@components/AlertBanner.vue";

interface FormData {
  berlinerWord?: string;
  translation?: string;
  example?: string;
  userMail?: string;
  userName?: string;
  [key: string]: string | undefined; // This is the index signature
}

let formData = reactive<FormData>({
  berlinerWord: "",
  translation: "",
  example: "",
  userMail: "",
  userName: "",
});

interface FormErrors {
  berlinerWord: string;
  translation: string;
  example: string;
  name: string;
  eMail: string;
  [key: string]: string; // This is the index signature
}

const formErrors = reactive<FormErrors>({
  berlinerWord: "",
  translation: "",
  example: "",
  name: "",
  eMail: "",
});

const formResponse = reactive({
  message: "",
  status: "",
});

/**
 * Posts the form data to the contact form 7 API
 *
 * @return  {Promise<void>}
 */
const postToContactForm7 = async (): Promise<void> => {
  const formInputs = new FormData();

  for (const name in formData) {
    formInputs.append(name, formData[name]);
  }

  await fetch(
    `${import.meta.env.PUBLIC_WP_REST_API}/contact-form-7/v1/contact-forms/${
      import.meta.env.PUBLIC_SUGGEST_WORD_FORM_ID
    }/feedback`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${import.meta.env.PUBLIC_WP_AUTH_REFRESH_TOKEN}`,
      },
      body: formInputs,
    },
  )
    .then((response) => response.json())
    .then((response) => {
      formResponse.message = response.message;
      formResponse.status = response.status;
      resetForm();
    })
    .catch((error) => {
      console.error(error);
    });
};

const resetForm = () => {
  if (formResponse.status === "mail_sent") {
    setTimeout(() => {
      formResponse.status = "";
      formData = convertObjectKeysTo(formData, "");
    }, 3000);
  }
};

/**
 * Turns all given object values to false
 *
 * @param   {}  object  The object values you want to turn falsy
 * @param   {}  to        Any data format
 *
 * @return  {}          returns object with falsy values
 */
const convertObjectKeysTo = <T,>(
  object: Record<string, T | undefined>,
  to: T,
): Record<string, T> => {
  return Object.fromEntries(Object.keys(object).map((key) => [key, to])) as Record<string, T>;
};

/**
 * Checks if all object values are true || false
 *
 * @param   {Object}  object    The object to check
 * @param   {Boolean}  checkFor  Boolean your are checking for
 *
 * @return  {Boolean}            Return if all are true or false
 */
const checkObjectValues = (object: object, checkFor: boolean = false): boolean => {
  return Object.values(object).every((v) => v === checkFor);
};

const checkObjectValueLength = (object) => {
  return Object.values(object).every((v) => v.length === 0);
};

/**
 * Validates the form
 *
 * @return  {void}     Submit form
 */
const checkForm = (): void => {
  for (const error in formErrors) {
    formErrors[error] = "";
  }

  if (formData?.berlinerWord?.length <= 1) {
    formErrors.berlinerWord = "Oh, ditt is aber een sehr kurzes Wort";
  }
  if (!formData.berlinerWord) {
    formErrors.berlinerWord = "Hey du hast ditt Wort vergessen.";
  }

  if (formData?.translation?.length <= 1) {
    formErrors.translation = "Ditt is aber ne kleene Übersetzung.";
  }
  if (!formData.translation) {
    formErrors.translation = "Ohne die Übersetzung wird dett etwas schwierig.";
  }

  if (formData.userName && formData.userName?.length <= 1) {
    formErrors.name = "Du hast nen sehr kleinen Namen";
  }
  if (formData.example && formData.example?.length <= 1) {
    formErrors.example = "Mehr is dir nicht eingefallen?";
  }

  // If an e-mail address is given, validate it
  if (formData?.userMail?.length > 0 && !validEmail(formData?.userMail)) {
    formErrors.eMail = "Irgendwas läuft hier nicht";
  }

  if (Object.values(formErrors).every((v) => v?.length === 0)) {
    postToContactForm7();
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
@use "@styles/components/form";
@use "@styles/components/suggest-word-form";
</style>
