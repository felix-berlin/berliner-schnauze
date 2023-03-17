// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/eslint-module',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/robots',
    'nuxt-simple-sitemap',
    '@nuxtjs/apollo',
    '@nuxtjs/html-validator',
    'nuxt-delay-hydration',
    '@nuxtjs/turnstile',
    '@nuxtjs/device'
    // ['@nuxtjs/stylelint-module', { /* module options */ }]
  ],

  buildModules: [
    'floating-vue/nuxt'
  ],

  plugins: [
    { src: '~/plugins/vue-matomo.ts', ssr: false }
  ],

  apollo: {
    clients: {
      default: {
        httpEndpoint: 'https://cms.webshaped.de/api'
      }
    }
  },

  pinia: {
    autoImports: [
      // automatically imports `defineStore`
      'defineStore', // import { defineStore } from 'pinia'
      ['defineStore', 'definePiniaStore'] // import { defineStore as definePiniaStore } from 'pinia'
    ]
  },

  delayHydration: {
    // enables nuxt-delay-hydration in dev mode for testing
    debug: process.env.NODE_ENV === 'development'
  }

  // TODO: add key
  // turnstile: {
  //   siteKey: '<your-site-key>',
  // },

})
