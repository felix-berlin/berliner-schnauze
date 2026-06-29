import type { App } from "vue";

import urql, { cacheExchange, fetchExchange } from "@urql/vue";
import { WP_API } from "astro:env/client";
import { vTooltip } from "@/directives/tooltip";

export default (app: App) => {
  app.directive("tooltip", vTooltip);
  app.use(urql, {
    exchanges: [cacheExchange, fetchExchange],
    fetchOptions: {
      headers: {
        "Content-Type": "application/json",
      },
    },
    url: WP_API,
  });
  if (process.env.NODE_ENV === "development") {
    void Promise.all([
      import("@nanostores/vue/devtools"),
      import("../stores/index"),
    ]).then(([{ devtools }, store]) => {
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
    });
  }
};
