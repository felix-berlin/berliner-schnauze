/// <reference types="vitest" />
import { defineConfig, coverageConfigDefaults } from "vitest/config";
import Vue from "@vitejs/plugin-vue";
import Icons from "unplugin-icons/vite";
import allAlias from "./alias.ts";

export default defineConfig({
  plugins: [
    Vue({
      script: {
        propsDestructure: true,
      },
    }),
    Icons({
      iconCustomizer(collection, icon, props) {
        // customize all icons in this collection
        if (collection === "tabler" || collection === "lucide") {
          props.width = "24";
          props.height = "24";
        }
      },
    }), // chooses the compiler automatically
  ],
  test: {
    include: ["src/tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["src/tests/unit/__needsFix/*"],
    globals: true,
    environment: "jsdom",
    setupFiles: ["src/tests/setup.ts", "@vitest/web-worker"],
    coverage: {
      include: ["src/**"],
      exclude: [
        "src/types/**",
        "src/env.d.ts",
        "src/pages/_app.ts",
        "src/plugins/**",
        "src/utils/supportedBrowsers.mjs",
        ...coverageConfigDefaults.exclude,
      ],
      reportsDirectory: "./tests/unit/coverage",
    },
  },
  resolve: {
    alias: allAlias,
  },
});
