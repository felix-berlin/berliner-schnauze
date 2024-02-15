import type { App } from "vue";
import FloatingVue from "floating-vue";
import { devtools } from "@nanostores/vue/devtools";
// import VueVirtualScroller from "vue-virtual-scroller";

import {
  $wordOfTheDay,
  $isDarkMode,
  $wordSearch,
  $filteredWordList,
  searchLength,
  $installPrompt,
  $showInstallButton,
  $showWordListFilterFlyout,
  $toastNotify,
  $activeFilterCount,
} from "../stores/index";

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
  app.use(devtools, {
    $wordOfTheDay,
    $isDarkMode,
    $wordSearch,
    $filteredWordList,
    searchLength,
    $installPrompt,
    $showInstallButton,
    $showWordListFilterFlyout,
    $toastNotify,
    $activeFilterCount,
  });
  // app.use(VueVirtualScroller);
};
