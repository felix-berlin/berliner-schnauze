import { resolve } from 'path'

export default {
  publicRuntimeConfig: {
    baseUrl: process.env.NODE_ENV === 'production' ? process.env.BASE_URL : 'http://localhost:3000',
    baseApiUrl: process.env.BASE_API_URL,
    appVersion: process.env.npm_package_version,
    sentryAuthToken: process.env.SENTRY_AUTH_TOKEN
  },
  privateRuntimeConfig: {},

  alias: {
    styles: resolve(__dirname, './assets/styles'),
    'sassy-scss': resolve(__dirname, './node_modules/@felix_berlin/sassy-scss/')
  },

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: {
    dirs: [
      '~/components',
      '~/components/word'
    ]
  },

  target: 'static',

  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    title: 'Berlinerisch zu Hochdeutsch Wörterbuch - Berliner Dialekt',
    htmlAttrs: {
      lang: 'de'
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'format-detection', content: 'telephone=no' },
      { name: 'theme-color', content: '#F9F9F9' },
      { hid: 'description', name: 'description', content: 'Berlinerisch ➡️ Hochdeutsch Wörterbuch. Keen Plan vom Berliner Dialekt? Kein Problem, hier ist das aktuellste Berliner Sprache Wörterbuch.' },
      { hid: 'og:title', property: 'og:title', content: 'Berlinerisch zu Hochdeutsch Wörterbuch - Berliner Dialekt' },
      { hid: 'og:description', property: 'og:description', content: 'Berlinerisch ➡️ Hochdeutsch Wörterbuch. Keen Plan vom Berliner Dialekt? Kein Problem, hier ist das aktuellste Berliner Sprache Wörterbuch.' },
      { hid: 'og:image', property: 'og:image', content: '/brown-bear-roar.png' },
      { hid: 'og:url', property: 'og:url', content: process.env.NODE_ENV === 'production' ? process.env.BASE_URL : 'http://localhost:3000' },
      { hid: 'og:type', property: 'og:type', content: 'website' }
    ],
    link: [
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/favicon/apple-touch-icon.png' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon/favicon-32x32.png' },
      { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon/favicon-16x16.png' },
      { rel: 'icon', type: 'image/x-icon', href: '/favicon/favicon.ico' }
    ]
  },

  // Sitemap
  sitemap: {
    hostname: process.env.NODE_ENV === 'production' ? process.env.BASE_URL : 'http://localhost:3000',
    gzip: true
  },

  // Global CSS: https://go.nuxtjs.dev/config-css
  css: [
    '~/assets/styles/app.scss'
  ],

  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [
    '@plugins/floating-vue',
    '@plugins/fuse',
    '@plugins/vue-uuid',
    '@modules/smooth-scroll-to',
    { src: '~/plugins/vue-matomo.js', ssr: false }
  ],

  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: [
    '@nuxtjs/eslint-module',
    '@nuxtjs/stylelint-module',
    '@nuxtjs/svg',
    '@nuxtjs/color-mode',
    'lucide-vue/nuxt',
    '@nuxtjs/device',
    '@nuxtjs/html-validator',
    '@/modules/sitemapRouteGenerator'
  ],

  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [
    // https://go.nuxtjs.dev/axios
    '@nuxtjs/axios',
    // '@nuxt/image', // Speedkit comes with a own (modified) version of image
    '@nuxtjs/sitemap',
    'nuxt-speedkit',
    '@nuxtjs/sentry',
    '@nuxtjs/robots'
  ],

  sentry: {
    // Additional Module Options go here
    // https://sentry.nuxtjs.org/sentry/options
    dsn: 'https://f84fd7469c2e4ca7b3680f5e151d3499@o1131599.ingest.sentry.io/6176241',
    disabled: process.env.NODE_ENV === 'development',
    tracing: {
      tracesSampleRate: 0.2
    },
    config: {
      // Add native Sentry config here
      // https://docs.sentry.io/platforms/javascript/guides/vue/configuration/options/
      publishRelease: {
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: 'Webshaped',
        project: 'berliner-schnauze',
        // Attach commits to the release (requires that the build triggered within a git repository).
        setCommits: {
          auto: true
        }
      }
    }
  },

  robots: {
    UserAgent: '*',
    Disallow: ''
  },

  // Axios module configuration: https://go.nuxtjs.dev/config-axios
  axios: {
    // Workaround to avoid enforcing hard-coded localhost:3000: https://github.com/nuxt-community/axios-module/issues/308
    baseUrl: '/'
  },

  // Build Configuration: https://go.nuxtjs.dev/config-build
  build: {

  },

  // image: {
  //   // Options
  // },

  stylelint: {
    fix: true,
    files: ['assets/**/*.{s?(a|c)ss,less,stylus}']
  },

  loading: {
    height: '3px',
    continuous: true,
    duration: 3000
  },

  toast: {
    position: 'top-right',
    containerClass: 'c-toast',
    className: 'c-toast__item'
  },

  speedkit: {
    detection: {
      performance: true,
      browserSupport: true
    },
    componentAutoImport: false,
    fonts: [{
      family: 'Berlin',
      locals: ['Berlin'],
      fallback: ['Arial', 'sans-serif'],
      variances: [
        {
          style: 'normal',
          weight: 400,
          sources: [
            { src: '@/assets/fonts/Berlin.woff2', type: 'woff2' }
          ]
        },
        {
          style: 'italic',
          weight: 400,
          sources: [
            { src: '@/assets/fonts/Berlin-Italic.woff2', type: 'woff2' }
          ]
        },
        {
          style: 'normal',
          weight: 700,
          sources: [
            { src: '@/assets/fonts/Berlin-Bold.woff2', type: 'woff2' }
          ]
        },
        {
          style: 'normal',
          weight: 900,
          sources: [
            { src: '@/assets/fonts/BerlinX-Bold.woff2', type: 'woff2' }
          ]
        }
      ]
    },
    {
      family: 'Berliner',
      locals: ['Berliner'],
      fallback: ['Arial', 'sans-serif'],
      variances: [
        {
          style: 'normal',
          weight: 400,
          sources: [
            { src: '@/assets/fonts/BerlinerRegular.woff2', type: 'woff2' }
          ]
        }
      ]
    }
    ]
  },

  htmlValidator: {
    usePrettier: true,
    failOnError: false
  }
}
