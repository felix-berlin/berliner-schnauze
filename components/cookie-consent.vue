<template>
  <div>
    <slot name="content" />

    <!-- Only for debugging -->
    <button type="button" @click="clearStorage">
      Clear
    </button>
    <button type="button" @click="acceptCookies('none')">
      <slot name="reject-button" />
    </button>
    <button type="button" @click="acceptCookies('accepted')">
      <slot name="accept-button" />
    </button>
  </div>
</template>

<script>

export default {
  name: 'CookieConsent',

  methods: {
    acceptCookies (type) {
      if (!['accepted', 'none'].includes(type)) {
        console.error('Invalid type')
      }

      localStorage.setItem('cookieConsent', type)
      this.$emit('accept-cookies', type)
    },

    clearStorage () {
      localStorage.clear()
    }
  }
}
</script>
