import type { App } from "vue";
import FloatingVue from "floating-vue";
import { devtools } from "@nanostores/vue/devtools";
// import VueVirtualScroller from "vue-virtual-scroller";

import * as store from "../stores/index";

export default (app: App) => {
  app.use(FloatingVue, {
    themes: {
      ...FloatingVue.options.themes,
      "word-options": {
        $extend: "dropdown",
        triggers: ["click"],
        autoHide: true,
        placement: "bottom",
      },
    },
  });
  if (process.env.NODE_ENV !== "production") {
    app.use(devtools, store);
  }

  // app.use(VueVirtualScroller);
};
