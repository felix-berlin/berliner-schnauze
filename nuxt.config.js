import { resolve } from 'path'
import { version } from './package.json'

export default {
  publicRuntimeConfig: {
    baseUrl: process.env.NODE_ENV === 'production' ? process.env.BASE_URL : 'http://localhost:3000',
    baseApiUrl: process.env.BASE_API_URL,
    appVersion: version,
    sentry: {
      config: {
        environment: process.env.NODE_ENV
      },
      serverConfig: {
      // Any server-specific config
      },
      clientConfig: {
      // Any client-specific config
      }
    }
  },

  privateRuntimeConfig: {
    sentryAuthToken: process.env.SENTRY_AUTH_TOKEN
  },

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

  generate: {
    fallback: true // enable fallback error pages in static mode

    // routes () {
    //   return axios.get(`${process.env.BASE_API_URL}/wp-json/berliner-schnauze/v1/words`).then((res) => {
    //     return res.data.map((word) => {
    //       return {
    //         route: '/word/' + word.post_name
    //         // payload: word
    //       }
    //     })
    //   })
    // }
  },

  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    title: 'Berliner Dialekt Wörterbuch - Berlinerisch zu Hochdeutsch',
    htmlAttrs: {
      lang: 'de'
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'format-detection', content: 'telephone=no' },
      { name: 'theme-color', content: '#F9F9F9' },
      { hid: 'description', name: 'description', content: 'Aktuelles Berlinerisch ➡️ Hochdeutsch Wörterbuch. Lerne mehr über: die Berliner Mundart, Berlinisch, den Berliner Jargon, Berlinerisch & Berolinismus.' },
      { hid: 'og:title', property: 'og:title', content: 'Berliner Dialekt Wörterbuch - Berlinerisch zu Hochdeutsch' },
      { hid: 'og:description', property: 'og:description', content: 'Aktuelles Berlinerisch ➡️ Hochdeutsch Wörterbuch. Lerne mehr über: die Berliner Mundart, Berlinisch, den Berliner Jargon, Berlinerisch & Berolinismus.' },
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
    '@modules/utility-modules',
    { src: '~/plugins/vue-matomo.js', ssr: false }
  ],

  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: [
    '@nuxtjs/eslint-module',
    '@nuxtjs/stylelint-module',
    '@nuxtjs/color-mode',
    'lucide-vue/nuxt',
    '@nuxtjs/device',
    // '@nuxtjs/html-validator',
    '@/modules/sitemap-route-generator'
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
    dsn: process.env.SENTRY_DNS,
    tracing: {
      tracesSampleRate: 0.2,
      vueOptions: {
        tracing: true,
        tracingOptions: {
          hooks: ['mount', 'update'],
          timeout: 2000,
          trackComponents: true
        }
      }
    },
    publishRelease: {
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      // Attach commits to the release (requires that the build triggered within a git repository).
      setCommits: {
        auto: true
      },
      release: process.env.npm_package_version
    },
    config: {
      // Add native Sentry config here
      // https://docs.sentry.io/platforms/javascript/guides/vue/configuration/options/
    }
  },

  robots: {
    UserAgent: '*',
    Disallow: '',
    Sitemap: process.env.BASE_URL + '/sitemap.xml'
  },

  // router: {
  //   // ran before every route on both client and server
  //   middleware: ['middleware']
  // },

  // Axios module configuration: https://go.nuxtjs.dev/config-axios
  axios: {
    // Workaround to avoid enforcing hard-coded localhost:3000: https://github.com/nuxt-community/axios-module/issues/308
    baseUrl: '/'
  },

  // Build Configuration: https://go.nuxtjs.dev/config-build
  build: {
    extend (config, { isClient }) {
      // Extend only webpack config for client-bundle
      if (isClient) {
        config.devtool = 'source-map'
      }
    },
    postcss: false // https://github.com/postcss/postcss/issues/1375
  },

  // image: {
  //   // Options
  // },

  stylelint: {
    fix: true,
    files: ['assets/styles/**/*.{s?(a|c)ss,less,stylus}']
  },

  loading: {
    height: '3px',
    continuous: true,
    duration: 3000
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
