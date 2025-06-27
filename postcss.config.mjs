import autoprefixer from "autoprefixer";
import postcssPresetEnv from "postcss-preset-env";

/** @type {import('postcss-load-config').Config} */
export default {
  plugins: [
    autoprefixer,
    postcssPresetEnv({
      features: {
        "cascade-layers": false,
      },
    }),
  ],
};
