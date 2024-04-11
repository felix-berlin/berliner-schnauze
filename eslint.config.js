import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginAstro from "eslint-plugin-astro";
import jsxA11yRecommended from "eslint-plugin-jsx-a11y";
import pluginVue from "eslint-plugin-vue";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
// TODO - add vuejs-accessibility/recommended

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  // ...tseslint.configs.recommendedTypeChecked,
  // ...tseslint.configs.stylisticTypeChecked,
  ...eslintPluginAstro.configs["flat/recommended"],
  // jsxA11yRecommended.configs["flat/jsx-a11y-recommended"],
  ...pluginVue.configs["flat/recommended"],
  eslintPluginPrettierRecommended,
  {
    files: ["**/*.ts", "**/*.js", "**/*.astro", "**/*.vue"],
    ignores: ["src/tests/*"],
    // languageOptions: {
    //   parserOptions: {
    //     project: true,
    //     tsconfigRootDir: import.meta.dirname,
    //   },
    // },
  },
);

// export default tseslint.config(
//   eslint.configs.recommended,
//   ...tseslint.configs.recommendedTypeChecked,
//   {
//     languageOptions: {
//       parserOptions: {
//         project: true,
//         tsconfigRootDir: import.meta.dirname,
//       },
//     },
//   },
// );
