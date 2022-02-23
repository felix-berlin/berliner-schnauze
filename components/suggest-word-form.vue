<template>
  <form class="c-suggest-word-form c-form" novalidate="true" @submit.prevent="checkForm">
    <div class="c-form__group">
      <div class="c-form__item is-vertical" :class="{'has-error': formErrors.berlinerWord.length}">
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
          >
          <Alert v-if="formErrors.berlinerWord.length" type="danger" class="c-floating-label__label c-floating-label__label--bottom c-alert--small">
            {{ formErrors.berlinerWord }}
          </Alert>
        </div>
      </div>

      <div class="c-form__item is-vertical" :class="{'has-error': formErrors.translation.length}">
        <label class="c-form__label c-label is-required" for="translation">Übersetzung in Hochdeutsche</label>
        <div class="c-floating-label">
          <input
            id="translation"
            v-model="formData.translation"
            class="c-input c-form__input c-floating-label__input"
            type="text"
            name="translation"
            placeholder=" "
          >
          <Alert v-if="formErrors.translation.length" type="danger" class="c-floating-label__label c-floating-label__label--bottom c-alert--small">
            {{ formErrors.translation }}
          </Alert>
        </div>
      </div>
    </div>

    <div class="c-form__item is-vertical" :class="{'c-textarea--error': formErrors.example.length}">
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
        <Alert v-if="formErrors.example.length" type="danger" class="c-floating-label__label c-floating-label__label--bottom c-alert--small">
          {{ formErrors.example }}
        </Alert>
      </div>
    </div>

    <div class="c-form__group">
      <div class="c-form__item is-vertical" :class="{'has-error': formErrors.name.length}">
        <label class="c-label c-form__label" for="user-name">Dein Name (optional)</label>
        <div class="c-floating-label">
          <input
            id="user-name"
            v-model="formData['user-name']"
            class="c-input c-form__input c-floating-label__input"
            type="text"
            name="user-name"
            placeholder=" "
          >
          <Alert v-if="formErrors.name.length" type="danger" class="c-floating-label__label c-floating-label__label--bottom c-alert--small">
            {{ formErrors.name }}
          </Alert>
        </div>
      </div>

      <div class="c-form__item is-vertical" :class="{'has-error': formErrors.eMail.length}">
        <label class="c-label c-form__label" for="user-email">Deine E-Mailadresse (optional)</label>
        <div class="c-floating-label">
          <input
            id="user-email"
            v-model="formData['user-mail']"
            class="c-input c-form__input c-input--email c-floating-label__input"
            type="email"
            name="user-email"
            placeholder=" "
          >
          <Alert v-if="formErrors.eMail.length" type="danger" class="c-floating-label__label c-floating-label__label--bottom c-alert--small">
            {{ formErrors.eMail }}
          </Alert>
        </div>
      </div>
    </div>

    <button class="c-button c-button--theme c-suggest-word-form__button" type="submit">
      <transition name="fade" mode="out-in">
        <div v-if="formResponse.status === 'mail_sent'" key="success" class="c-suggest-word-form__success-message">
          <span class="c-suggest-word-form__success-icon"><Check /></span><span>{{ formResponse.message }}</span>
        </div>
        <span v-else key="button-text">Wort einreichen</span>
      </transition>
    </button>
  </form>
</template>

<script>
import { Check } from 'lucide-vue'

export default {
  name: 'SuggestWordForm',

  components: {
    Check
  },

  data () {
    return {
      formData: {
        'berliner-word': '',
        translation: '',
        example: '',
        'user-mail': '',
        'user-name': ''
      },
      formErrors: {
        berlinerWord: '',
        translation: '',
        example: '',
        name: '',
        eMail: ''
      },
      formResponse: {
        message: '',
        status: ''
      }
    }
  },

  methods: {
    formSubmit () {
      const formInputs = new FormData()

      for (const name in this.formData) {
        formInputs.append(name, this.formData[name])
      }

      this.$axios({
        method: 'post',
        url: this.$config.baseApiUrl + '/wp-json/contact-form-7/v1/contact-forms/4733/feedback',
        data: formInputs,
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then((response) => {
        this.formResponse.message = response.data.message
        this.formResponse.status = response.data.status
        this.resetForm()
      }).catch((error) => {
        this.$sentry.captureException(error)
      })
    },

    resetForm () {
      if (this.formResponse.status === 'mail_sent') {
        setTimeout(() => {
          this.formResponse.status = ''
          this.formData = this.convertObjectKeysTo(this.formData, '')
        }, 3000)
      }
    },

    /**
     * Turns all given object values to false
     *
     * @param   {Object}  object  The object values you want to turn falsy
     * @param   {Void}  to        Any data format
     *
     * @return  {Object}          returns object with falsy values
     */
    convertObjectKeysTo (object, to) {
      return Object.fromEntries(Object.keys(object).map(key => [key, to]))
    },

    /**
     * Checks if all object values are true || false
     *
     * @param   {Object}  object    The object to check
     * @param   {Boolean}  checkFor  Boolean your are checking for
     *
     * @return  {Boolean}            Return if all are true or false
     */
    checkObjectValues (object, checkFor = false) {
      return Object.values(object).every(v => v === checkFor)
    },

    checkObjectValueLength (object) {
      return Object.values(object).every(v => v.length === 0)
    },

    /**
     * Validates the form
     *
     * @return  {Function}     Submit form
     */
    checkForm () {
      for (const error in this.formErrors) {
        this.formErrors[error] = ''
      }

      if (this.formData['berliner-word'].length <= 1) { this.formErrors.berlinerWord = 'Oh, ditt is aber een sehr kurzes Wort' }
      if (!this.formData['berliner-word']) { this.formErrors.berlinerWord = 'Hey du hast ditt Wort vergessen.' }

      if (this.formData.translation.length <= 1) { this.formErrors.translation = 'Ditt is aber ne kleene Übersetzung.' }
      if (!this.formData.translation) { this.formErrors.translation = 'Ohne die Übersetzung wird dett etwas schwierig.' }

      if (this.formData['user-name'] && this.formData['user-name'].length <= 1) { this.formErrors.name = 'Du hast nen sehr kleinen Namen' }
      if (this.formData.example && this.formData.example.length <= 1) { this.formErrors.example = 'Mehr is dir nicht eingefallen?' }

      // If an e-mail address is given, validate it
      if (this.formData['user-mail'].length > 0 && !this.validEmail(this.formData['user-mail'])) {
        this.formErrors.eMail = 'Irgendwas läuft hier nicht'
      }

      if (Object.values(this.formErrors).every(v => v.length === 0)) {
        this.formSubmit()
      }
    },

    /**
     * Checks if its a real email address
     *
     * @param   {String}  email  E-Mail address
     *
     * @return  {Boolean}         If check passes return true
     */
    validEmail (email) {
      const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      return re.test(email)
    }
  }
}
</script>
