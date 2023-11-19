import { CodegenConfig } from "@graphql-codegen/cli";
import * as dotenv from "dotenv";
dotenv.config();
console.log(process.env.WP_AUTH_USER);

const config: CodegenConfig = {
  schema: [
    {
      "https://cms.webshaped.de/api": {
        headers: {
          Authorization: `Bearer ${import.meta.env.PUBLIC_WP_AUTH_REFRESH_TOKEN}`,
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
