import type { CodegenConfig } from "@graphql-codegen/cli";
import { loadEnv } from "vite";
const { WP_AUTH_REFRESH_TOKEN } = loadEnv(process.env.NODE_ENV, process.cwd(), "");

const config: CodegenConfig = {
  schema: [
    {
      "https://cms.berliner-schnauze.wtf/api": {
        headers: {
          Authorization: `Bearer ${WP_AUTH_REFRESH_TOKEN}`,
        },
      },
    },
  ],
  generates: {
    "src/types/generated/graphql.d.ts": {
      plugins: ["typescript", "typescript-operations"],
      config: {
        maybeValue: "T | null | undefined",
      },
    },
    "./graphql.schema.json": {
      plugins: ["introspection"],
    },
  },
};

export default config;
