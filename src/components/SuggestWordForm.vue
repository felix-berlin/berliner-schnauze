<template>
  <form class="c-suggest-word-form c-form" novalidate="true" @submit.prevent="checkForm">
    <div class="c-form__group">
      <div
        class="c-form__item is-vertical"
        :class="{ 'has-error': formErrors.berlinerWord.length }"
      >
        <label class="c-form__label c-label is-required" for="berliner-wort">Berliner Wort</label>
        <div class="c-floating-label">
          <input
            id="berliner-wort"
            v-model="formData['berliner-word']"
            class="c-input c-form__input c-floating-label__input"
            type="text"
            name="berliner-wort"
            placeholder=" "
            required
          />
          <AlertBanner
            v-if="formErrors.berlinerWord.length"
            type="danger"
            class="c-floating-label__label c-floating-label__label--bottom c-alert--small"
          >
            {{ formErrors.berlinerWord }}
          </AlertBanner>
        </div>
      </div>

      <div class="c-form__item is-vertical" :class="{ 'has-error': formErrors.translation.length }">
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
            v-if="formErrors.translation.length"
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
      :class="{ 'c-textarea--error': formErrors.example.length }"
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
          v-if="formErrors.example.length"
          type="danger"
          class="c-floating-label__label c-floating-label__label--bottom c-alert--small"
        >
          {{ formErrors.example }}
        </AlertBanner>
      </div>
    </div>

    <div class="c-form__group">
      <div class="c-form__item is-vertical" :class="{ 'has-error': formErrors.name.length }">
        <label class="c-label c-form__label" for="user-name">Dein Name (optional)</label>
        <div class="c-floating-label">
          <input
            id="user-name"
            v-model="formData['user-name']"
            class="c-input c-form__input c-floating-label__input"
            type="text"
            name="user-name"
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

      <div class="c-form__item is-vertical" :class="{ 'has-error': formErrors.eMail.length }">
        <label class="c-label c-form__label" for="user-email">Deine E-Mailadresse (optional)</label>
        <div class="c-floating-label">
          <input
            id="user-email"
            v-model="formData['user-mail']"
            class="c-input c-form__input c-input--email c-floating-label__input"
            type="email"
            name="user-email"
            placeholder=" "
          />
          <AlertBanner
            v-if="formErrors.eMail.length"
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
        v-if="formResponse.status !== 'mail_sent' && formResponse.status.length"
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

let formData = reactive({
  "berliner-word": "",
  translation: "",
  example: "",
  "user-mail": "",
  "user-name": "",
});

const formErrors = reactive({
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

const formSubmit = () => {
  const formInputs = new FormData();

  for (const name in formData) {
    formInputs.append(name, formData[name]);
  }

  fetch(`${import.meta.env.PUBLIC_WP_API}/wp-json/contact-form-7/v1/contact-forms/4733/feedback`, {
    method: "POST",
    headers: { "Content-Type": "multipart/form-data" },
    body: formInputs,
  })
    .then((response) => response.json())
    .then((response) => {
      formResponse.message = response.data.message;
      formResponse.status = response.data.status;
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
 * @param   {Object}  object  The object values you want to turn falsy
 * @param   {Void}  to        Any data format
 *
 * @return  {Object}          returns object with falsy values
 */
const convertObjectKeysTo = (object, to) => {
  return Object.fromEntries(Object.keys(object).map((key) => [key, to]));
};

/**
 * Checks if all object values are true || false
 *
 * @param   {Object}  object    The object to check
 * @param   {Boolean}  checkFor  Boolean your are checking for
 *
 * @return  {Boolean}            Return if all are true or false
 */
const checkObjectValues = (object, checkFor = false) => {
  return Object.values(object).every((v) => v === checkFor);
};

const checkObjectValueLength = (object) => {
  return Object.values(object).every((v) => v.length === 0);
};

/**
 * Validates the form
 *
 * @return  {Function}     Submit form
 */
const checkForm = () => {
  for (const error in formErrors) {
    formErrors[error] = "";
  }

  if (formData["berliner-word"].length <= 1) {
    formErrors.berlinerWord = "Oh, ditt is aber een sehr kurzes Wort";
  }
  if (!formData["berliner-word"]) {
    formErrors.berlinerWord = "Hey du hast ditt Wort vergessen.";
  }

  if (formData.translation.length <= 1) {
    formErrors.translation = "Ditt is aber ne kleene Übersetzung.";
  }
  if (!formData.translation) {
    formErrors.translation = "Ohne die Übersetzung wird dett etwas schwierig.";
  }

  if (formData["user-name"] && formData["user-name"].length <= 1) {
    formErrors.name = "Du hast nen sehr kleinen Namen";
  }
  if (formData.example && formData.example.length <= 1) {
    formErrors.example = "Mehr is dir nicht eingefallen?";
  }

  // If an e-mail address is given, validate it
  if (formData["user-mail"].length > 0 && !validEmail(formData["user-mail"])) {
    formErrors.eMail = "Irgendwas läuft hier nicht";
  }

  if (Object.values(formErrors).every((v) => v.length === 0)) {
    formSubmit();
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
