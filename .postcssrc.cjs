module.exports = {
  plugins: [
    require("autoprefixer"),
    require("postcss-preset-env")({
      features: {
        "cascade-layers": false,
      },
    }),
  ],
};
