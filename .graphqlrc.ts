import type { IGraphQLConfig } from "graphql-config";

const config: IGraphQLConfig = {
  schema: "https://cms.webshaped.de/api",
  extensions: {
    codegen: {
      generates: {
        "./src/types/generated/graphql.d.ts": {
          plugins: ["typescript", "typescript-operations", "introspection"],
          preset: "client",
        },
      },
    },
  },
};

export default config;
