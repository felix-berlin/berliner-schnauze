import type { IGraphQLConfig } from "graphql-config";

const config: IGraphQLConfig = {
  schema: "./schema.graphql",
  documents: "src/**/*.{graphql,js,ts,jsx,tsx}",
};

export default config;
