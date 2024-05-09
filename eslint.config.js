import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginAstro from "eslint-plugin-astro";
// import jsxA11yRecommended from "eslint-plugin-jsx-a11y";
import pluginVue from "eslint-plugin-vue";
import pluginVueA11y from "eslint-plugin-vuejs-accessibility";
import tsEslintParser from "@typescript-eslint/parser";
import vueParser from "vue-eslint-parser";
import url from "node:url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  // ...tseslint.configs.recommendedTypeChecked,
  // ...tseslint.configs.stylisticTypeChecked,
  ...eslintPluginAstro.configs.recommended,
  // jsxA11yRecommended.configs["flat/jsx-a11y-recommended"], // TODO - add when fixed: https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/issues/978
  ...pluginVue.configs["flat/recommended"],
  ...pluginVueA11y.configs["flat/recommended"],
  {
    // files: ["**/*.ts", "**/*.js", "**/*.astro", "**/*.vue"],
    ignores: [
      "src/tests",
      "**/coverage/",
      "dist/",
      "**/dev-dist/",
      "**/node_modules/",
      "**/__snapshots__/",
      "src/types/generated/",
    ],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        project: "tsconfig.json",
        tsconfigRootDir: __dirname,
        extraFileExtensions: [".vue", ".astro"],
      },
    },
  },
  // {
  //   files: ["**/*.js"],
  //   ...tseslint.configs.disableTypeChecked,
  // },
);
