/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="../.astro/astro-env.d.ts" />

declare module "@pagefind/default-ui";
declare module "*.gql";
declare module "*.graphql";

declare global {
  interface Window {
    _paq: Array<(string | number | boolean | null | undefined | object)[]>;
  }
}

export {};
