import Vue from 'vue'
import VueMatomo from 'vue-matomo'

export default ({ app }) => {
  Vue.use(VueMatomo, {
    router: app.router,
    host: '//jebongt.de',
    siteId: 8,
    debug: true,
    disableCookies: true,
    enableHeartBeatTimer: true
  })
  window._paq.push(['trackVisibleContentImpressions'])
  window._paq.push(['logAllContentBlocksOnPage'])
}
