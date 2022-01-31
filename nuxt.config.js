import { resolve } from 'path'

export default {
  alias: {
    styles: resolve(__dirname, './assets/styles'),
    'sassy-scss': resolve(__dirname, './node_modules/@felix_berlin/sassy-scss/')
  },

  target: 'static',

  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    title: 'Berlinerisch zu Hochdeutsch Wörterbuch - Berliner Schnauze',
    htmlAttrs: {
      lang: 'de'
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: 'Berlinerisch zu Hochdeutsch Wörterbuch, von Berliner für alle.' },
      { name: 'format-detection', content: 'telephone=no' }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
    ]
  },

  // Sitemap
  sitemap: {
    hostname: 'https://berliner-schnauze.wtf',
    gzip: true
  },

  // Global CSS: https://go.nuxtjs.dev/config-css
  css: [
    '~/assets/styles/app.scss'
  ],

  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [
    '@plugins/vue2-smooth-scroll',
    '@plugins/vue-waypoint',
    '@plugins/floating-vue',
    '@plugins/fuse',
    '@plugins/vue-uuid',
    '@plugins/smooth-scroll-to'
  ],

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: true,

  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: [
    '@nuxtjs/eslint-module',
    '@nuxtjs/stylelint-module',
    '@nuxtjs/svg',
    '@nuxtjs/color-mode',
    'lucide-vue/nuxt',
    '@nuxtjs/device',
    '@nuxtjs/html-validator'
    // '@nuxtjs/dotenv'
  ],

  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [
    // https://go.nuxtjs.dev/axios
    '@nuxtjs/axios',
    '@nuxt/image',
    '@nuxtjs/sitemap',
    '@nuxtjs/toast',
    'nuxt-protected-mailto',
    'nuxt-speedkit',
    'nuxt-precompress'
    // '@dewib/xhr-cache'
    // 'nuxt-matomo' // https://github.com/pimlie/nuxt-matomo
  ],

  // Axios module configuration: https://go.nuxtjs.dev/config-axios
  axios: {
    // Workaround to avoid enforcing hard-coded localhost:3000: https://github.com/nuxt-community/axios-module/issues/308
    baseURL: '/'
  },

  // xhrCache: {
  //   name: 'word-list',
  //   maxAge: 3600 * 1000, // TTL of resource
  //   init: true, // Fetch the resource at nuxt start
  //   request: {
  //     method: 'get',
  //     url: 'https://webshaped.de/wp-json/berlinerisch/v1/post'
  //   }
  // },

  // Build Configuration: https://go.nuxtjs.dev/config-build
  build: {
    html: {
      minify: {
        decodeEntities: false
      }
    }
  },

  image: {
    // Options
  },

  stylelint: {
    fix: true,
    files: ['assets/**/*.{s?(a|c)ss,less,stylus}']
  },

  loading: {
    color: 'DodgerBlue',
    height: '10px',
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
    componentAutoImport: true,
    fonts: [{
      family: 'Berlin',
      locals: ['Berlin'],
      fallback: ['Arial', 'sans-serif'],
      variances: [
        {
          style: 'normal',
          weight: 'normal',
          sources: [
            { src: '@/assets/fonts/Berlin.woff2', type: 'woff2' }
          ]
        },
        {
          style: 'italic',
          weight: 'normal',
          sources: [
            { src: '@/assets/fonts/Berlin-Italic.woff2', type: 'woff2' }
          ]
        },
        {
          style: 'normal',
          weight: 'bold',
          sources: [
            { src: '@/assets/fonts/Berlin-Bold.woff2', type: 'woff2' }
          ]
        },
        {
          style: 'normal',
          weight: 'bolder',
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

  nuxtPrecompress: {
    enabled: true, // Enable in production
    report: true, // set true to turn one console messages during module init
    test: /\.(js|css|html|txt|xml|svg)$/, // files to compress on build
    // Serving options
    middleware: {
      // You can disable middleware if you serve static files using nginx...
      enabled: true,
      // Enable if you have .gz or .br files in /static/ folder
      enabledStatic: true,
      // Priority of content-encodings, first matched with request Accept-Encoding will me served
      encodingsPriority: ['br', 'gzip']
    },

    // build time compression settings
    gzip: {
      // should compress to gzip?
      enabled: true,
      // compression config
      // https://www.npmjs.com/package/compression-webpack-plugin
      filename: '[path].gz[query]', // middleware will look for this filename
      threshold: 10240,
      minRatio: 0.8,
      compressionOptions: { level: 9 }
    },
    brotli: {
      // should compress to brotli?
      enabled: true,
      // compression config
      // https://www.npmjs.com/package/compression-webpack-plugin
      filename: '[path].br[query]', // middleware will look for this filename
      compressionOptions: { level: 11 },
      threshold: 10240,
      minRatio: 0.8
    }
  },

  htmlValidator: {
    usePrettier: true,
    failOnError: false,
    options: {
      extends: [
        'html-validate:document',
        'html-validate:recommended',
        'html-validate:standard'
      ],
      rules: {
        'svg-focusable': 'off',
        'no-unknown-elements': 'error',
        // Conflicts or not needed as we use prettier formatting
        'void-style': 'off',
        'no-trailing-whitespace': 'off',
        // Conflict with Nuxt defaults
        'require-sri': 'off',
        'attribute-boolean-style': 'off',
        'doctype-style': 'off',
        // Unreasonable rule
        'no-inline-style': 'off'
      }
    }
  }
}
