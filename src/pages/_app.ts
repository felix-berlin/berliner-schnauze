import type { App } from "vue";
import FloatingVue from "floating-vue";
import { devtools } from "@nanostores/vue/devtools";
import urql, { cacheExchange, fetchExchange } from "@urql/vue";
import { WP_API } from "astro:env/client";
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
  app.use(urql, {
    url: WP_API,
    fetchOptions: {
      headers: {
        "Content-Type": "application/json",
      },
    },
    exchanges: [cacheExchange, fetchExchange],
  });
  if (process.env.NODE_ENV !== "production") {
    app.use(devtools, store);
  }

  // app.use(VueVirtualScroller);
};
