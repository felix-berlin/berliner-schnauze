import type { App } from "vue";

import { vTooltip } from "@/directives/tooltip";

export default (app: App) => {
  app.directive("tooltip", vTooltip);
  if (process.env.NODE_ENV === "development") {
    void Promise.all([import("@nanostores/vue/devtools"), import("../stores/index")]).then(
      ([{ devtools }, store]) => {
        app.use(devtools, {
          "App - $installPrompt": store.$installPrompt,
          "App - $isPwaInstalled": store.$isPwaInstalled,
          "App - $showInstallButton": store.$showInstallButton,
          "Dark Mode - $isDarkMode": store.$isDarkMode,
          "Modal - $element": store.$element,
          "Modal - $props": store.$props,
          "Modal - $view": store.$view,
          "Toast - $toastNotify": store.$toastNotify,
          "Word List - $activeFilterCount": store.$activeFilterCount,
          "Word List - $oramaSearchResults": store.$oramaSearchResults,
          "Word List - $searchResultCount": store.$searchResultCount,
          "Word List - $showWordListFilterFlyout": store.$showWordListFilterFlyout,
          "Word List - $wordSearch": store.$wordSearch,
          "Word of the Day - $wordOfTheDay": store.$wordOfTheDay,
        });
      },
    );
  }
};
