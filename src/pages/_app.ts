import type { App } from "vue";

import { devtools } from "@nanostores/vue/devtools";
import urql, { cacheExchange, fetchExchange } from "@urql/vue";
import { WP_API } from "astro:env/client";
import FloatingVue from "floating-vue";

import * as store from "../stores/index";

export default (app: App) => {
  app.use(FloatingVue, {
    themes: {
      ...FloatingVue.options.themes,
      "word-options": {
        $extend: "dropdown",
        autoHide: true,
        placement: "bottom",
        triggers: ["click"],
      },
    },
  });
  app.use(urql, {
    exchanges: [cacheExchange, fetchExchange],
    fetchOptions: {
      headers: {
        "Content-Type": "application/json",
      },
    },
    url: WP_API,
  });
  if (process.env.NODE_ENV !== "production") {
    app.use(devtools, {
      "App - $installPrompt": store.$installPrompt,
      "App - $isPwaInstalled": store.$isPwaInstalled,
      "App - $showInstallButton": store.$showInstallButton,
      "Dark Mode - $isDarkMode": store.$isDarkMode,
      "Modal - $element": store.$element,
      "Modal - $isOpen": store.$isOpen,
      "Modal - $onCloseCallback": store.$onCloseCallback,
      "Modal - $props": store.$props,
      "Modal - $scrollPosition": store.$scrollPosition,
      "Modal - $view": store.$view,
      "Modal - $viewIsComponent": store.$viewIsComponent,
      "Toast - $toastNotify": store.$toastNotify,
      "Word List - $activeFilterCount": store.$activeFilterCount,
      "Word List - $oramaSearchResults": store.$oramaSearchResults,
      "Word List - $searchResultCount": store.$searchResultCount,
      "Word List - $showWordListFilterFlyout": store.$showWordListFilterFlyout,
      "Word List - $wordSearch": store.$wordSearch,
      "Word List - searchLength": store.searchLength,
      "Word of the Day - $wordOfTheDay": store.$wordOfTheDay,
    });
  }
};
