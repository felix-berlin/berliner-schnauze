import Vue from 'vue'
import VueMatomo from 'vue-matomo'

export default ({ app }) => {
  Vue.use(VueMatomo, {
    router: app.router,
    host: '//jebongt.de',
    siteId: 8,
    debug: true,
    disableCookies: process.env.NODE_ENV !== 'production',
    enableHeartBeatTimer: true,
    heartBeatTimerInterval: 5
  })
}
