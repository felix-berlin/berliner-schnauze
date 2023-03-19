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
    // 'nuxt-delay-hydration',
    '@nuxtjs/turnstile',
    '@nuxtjs/device',
    '@nuxt/devtools',
    '@pinia/nuxt'
    // ['@nuxtjs/stylelint-module', { /* module options */ }]
  ],

  buildModules: [
    'floating-vue/nuxt'
  ],

  plugins: [

  ],

  imports: {
    dirs: ['stores']
  },

  apollo: {
    clients: {
      default: {
        httpEndpoint: 'https://cms.webshaped.de/api'
      }
    }
  },

  pinia: {
    autoImports: ['defineStore', 'acceptHMRUpdate']
  },

  delayHydration: {
    // enables nuxt-delay-hydration in dev mode for testing
    debug: process.env.NODE_ENV === 'development'
  },

  // TODO: add key
  // turnstile: {
  //   siteKey: '<your-site-key>',
  // },
  devtools: {
    // Enable devtools (default: true)
    enabled: false,
    // VS Code Server options
    vscode: {}
    // ...other options
  }
})
