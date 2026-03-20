import type { CodegenConfig } from "@graphql-codegen/cli";

import { loadEnv } from "vite";

const { WP_API, WP_AUTH_REFRESH_TOKEN } = loadEnv(process.env.NODE_ENV, process.cwd(), "");

const config: CodegenConfig = {
  documents: ["src/**/*.{graphql,js,ts,jsx,tsx,vue}", "!src/gql/**/*"],
  generates: {
    "./schema.graphql": {
      config: {
        includeDirectives: true,
      },
      plugins: ["schema-ast"],
    },
    "./src/gql/": {
      config: {
        useTypeImports: true,
      },
      plugins: [],
      preset: "client",
    },
  },
  hooks: { afterAllFileWrite: ["pnpm exec oxfmt --no-error-on-unmatched-pattern"] },
  ignoreNoDocuments: true, // for better experience with the watcher
  schema: [
    {
      [WP_API]: {
        headers: {
          Authorization: `Bearer ${WP_AUTH_REFRESH_TOKEN}`,
        },
      },
    },
  ],
};

export default config;
