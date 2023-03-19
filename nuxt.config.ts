import { fileURLToPath } from 'node:url'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: true,

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
    '@pinia/nuxt',
    '@nuxt/image-edge'
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

  alias: {
    '@images': fileURLToPath(new URL('./assets/images', import.meta.url)),
    '@styles': fileURLToPath(new URL('./assets/styles', import.meta.url)),
    '@sass-butler': fileURLToPath(new URL('./node_modules/@felix_berlin/sass-butler/', import.meta.url))
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
