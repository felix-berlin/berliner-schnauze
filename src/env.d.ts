// oxlint-disable-next-line typescript/triple-slash-reference
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="../.astro/astro-env.d.ts" />

declare module "*.gql";
declare module "*.graphql";
declare module "hyphenation.de";
declare module "hypher";
declare module "de-compromise";

declare global {
  interface Window {
    _paq: Array<(boolean | null | number | object | string | undefined)[]>;
  }
}

export {};
