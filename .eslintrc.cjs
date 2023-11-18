/* eslint-env node */
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:astro/recommended",
    "plugin:astro/jsx-a11y-recommended",
    "plugin:vue/vue3-recommended",
    "plugin:vuejs-accessibility/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  root: true,
  overrides: [
    {
      // Define the configuration for `.astro` file.
      files: ["*.astro"],
      // Allows Astro components to be parsed.
      parser: "astro-eslint-parser",
      // Parse the script in `.astro` as TypeScript by adding the following configuration.
      // It's the setting you need when using TypeScript.
      parserOptions: {
        parser: "@typescript-eslint/parser",
        extraFileExtensions: [".astro"],
      },
      rules: {
        // override/add rules settings here, such as:
        // "astro/no-set-html-directive": "error"
      },
    },
    {
      files: ["*.vue"],
      parser: "vue-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
        extraFileExtensions: [".vue"],
      },
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
  ],
  rules: {},
};
