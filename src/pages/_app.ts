import type { App } from "vue";
import FloatingVue from "floating-vue";
import { autoAnimatePlugin } from "@formkit/auto-animate/vue";
import { devtools } from "@nanostores/vue/devtools";

// import {
//   currentWebmentionsCount,
//   isDarkMode,
//   guest,
//   currentLanguage,
//   installPrompt,
//   isMobileBreakpoint,
//   windowWidth,
// } from "@stores/store";

export default (app: App) => {
  app.use(FloatingVue, {
    themes: {
      ...FloatingVue.options.themes,
      submenu: {
        $extend: "menu",
        distance: 8,
        placement: "bottom-start",
        popperClass: "c-menu__dropdown",
      },
    },
  });
  app.use(autoAnimatePlugin);
  // app.use(devtools, {
  //   currentWebmentionsCount,
  //   isDarkMode,
  //   guest,
  //   currentLanguage,
  //   installPrompt,
  //   isMobileBreakpoint,
  //   windowWidth,
  // });
};
