import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginAstro from "eslint-plugin-astro";
// import jsxA11yRecommended from "eslint-plugin-jsx-a11y";
import pluginVue from "eslint-plugin-vue";
// TODO - add vuejs-accessibility/recommended
import tsEslintParser from "@typescript-eslint/parser";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  // ...tseslint.configs.stylisticTypeChecked,
  ...eslintPluginAstro.configs["flat/recommended"],
  // jsxA11yRecommended.configs["flat/jsx-a11y-recommended"], // TODO - add when fixed: https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/issues/978
  ...pluginVue.configs["flat/recommended"],
  {
    // files: ["**/*.ts", "**/*.js", "**/*.astro", "**/*.vue"],
    ignores: ["src/tests/*"],
    languageOptions: {
      parserOptions: {
        parser: tsEslintParser,
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: [".vue"],
      },
    },
  },
  {
    files: ["*.js"],
    ...tseslint.configs.disableTypeChecked,
  },
);
