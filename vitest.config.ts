/// <reference types="vitest" />
import { getViteConfig } from "astro/config";
import { coverageConfigDefaults } from "vitest/config";

export default getViteConfig({
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
});
