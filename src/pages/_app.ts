import type { App } from "vue";
import FloatingVue from "floating-vue";
import { autoAnimatePlugin } from "@formkit/auto-animate/vue";
import { devtools } from "@nanostores/vue/devtools";
import VueVirtualScroller from "vue-virtual-scroller";
import { wordOfTheDay, isDarkMode } from "@stores/index";

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
  app.use(autoAnimatePlugin);
  app.use(devtools, {
    wordOfTheDay,
    isDarkMode,
  });
  app.use(VueVirtualScroller);
};
