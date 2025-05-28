import type { App } from "vue";
import FloatingVue from "floating-vue";
import { devtools } from "@nanostores/vue/devtools";
import urql, { cacheExchange, fetchExchange } from "@urql/vue";
import { WP_API } from "astro:env/client";
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
    app.use(devtools, {
      "Dark Mode - $isDarkMode": store.$isDarkMode,
      "App - $installPrompt": store.$installPrompt,
      "App - $showInstallButton": store.$showInstallButton,
      "App - $isPwaInstalled": store.$isPwaInstalled,
      "Modal - $isOpen": store.$isOpen,
      "Modal - $view": store.$view,
      "Modal - $props": store.$props,
      "Modal - $element": store.$element,
      "Modal - $viewIsComponent": store.$viewIsComponent,
      "Modal - $onCloseCallback": store.$onCloseCallback,
      "Modal - $scrollPosition": store.$scrollPosition,
      "Toast - $toastNotify": store.$toastNotify,
      "Word List - $wordSearch": store.$wordSearch,
      "Word List - $activeFilterCount": store.$activeFilterCount,
      "Word List - $showWordListFilterFlyout": store.$showWordListFilterFlyout,
      "Word List - $oramaSearchResults": store.$oramaSearchResults,
      "Word List - searchLength": store.searchLength,
      "Word List - $searchResultCount": store.$searchResultCount,
      "Word of the Day - $wordOfTheDay": store.$wordOfTheDay,
    });
  }
};
