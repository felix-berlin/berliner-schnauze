import eslint from "@eslint/js";
import graphqlPlugin from "@graphql-eslint/eslint-plugin";
import tsEslintParser from "@typescript-eslint/parser";
import astroEslintParser from "astro-eslint-parser";
import eslintPluginAstro from "eslint-plugin-astro";
import jsxA11y from "eslint-plugin-jsx-a11y";
import perfectionist from "eslint-plugin-perfectionist";
import pluginVue from "eslint-plugin-vue";
import pluginVueA11y from "eslint-plugin-vuejs-accessibility";
import url from "node:url";
import tseslint from "typescript-eslint";
import vueParser from "vue-eslint-parser";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  // ...tseslint.configs.stylisticTypeChecked,
  ...eslintPluginAstro.configs["flat/recommended"],
  jsxA11y.flatConfigs.recommended,
  ...pluginVue.configs["flat/recommended"],
  ...pluginVueA11y.configs["flat/recommended"],
  perfectionist.configs["recommended-natural"],
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
      "**/*.config.{mjs,cjs,ts,js}",
      "**/*.test.ts",
    ],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsEslintParser,
        project: "tsconfig.json",
        tsconfigRootDir: __dirname,
        extraFileExtensions: [".vue"],
      },
    },
  },
  {
    files: ["**/*.js"],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ["**/*.vue"],
    rules: {
      "vuejs-accessibility/label-has-for": [
        "error",
        {
          components: ["VLabel"],
          controlComponents: ["VInput"],
          required: {
            every: ["id"],
          },
          allowChildren: false,
        },
      ],
    },
  },
  {
    files: ["**/*.astro"],
    languageOptions: {
      parser: astroEslintParser,
      parserOptions: {
        parser: tsEslintParser,
        extraFileExtensions: [".astro"],
      },
    },
  },
  {
    files: ["**/*.graphql"],
    languageOptions: {
      parser: graphqlPlugin.parser,
    },
    plugins: {
      "@graphql-eslint": graphqlPlugin,
    },
  },
);
