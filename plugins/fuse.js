import Vue from 'vue'

import Fuse from 'fuse.js'

Object.defineProperty(Vue.prototype, '$fuse', { value: Fuse })
