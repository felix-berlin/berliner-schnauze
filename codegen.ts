import type { CodegenConfig } from "@graphql-codegen/cli";
import * as dotenv from "dotenv";
dotenv.config();

const config: CodegenConfig = {
  schema: [
    {
      "https://cms.berliner-schnauze.wtf/api": {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_WP_AUTH_REFRESH_TOKEN}`,
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
