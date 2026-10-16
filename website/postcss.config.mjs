import postcssPresetEnv from "postcss-preset-env";

/** @type {import('postcss-load-config').Config} */
export default {
  plugins: [
    // Includes autoprefixer; targets come from .browserslistrc
    postcssPresetEnv({
      features: {
        "cascade-layers": false,
      },
    }),
  ],
};
