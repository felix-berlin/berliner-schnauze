// oxlint-disable-next-line typescript/triple-slash-reference
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="../.astro/astro-env.d.ts" />

declare module "*.gql";
declare module "*.graphql";

interface TurnstileInstance {
  render(
    selector: string,
    options: {
      callback?: (response: string) => void;
      "error-callback"?: unknown;
      "expired-callback"?: unknown;
      sitekey: string;
      theme?: "auto" | "dark" | "light";
    },
  ): string | undefined;
}

declare global {
  interface Window {
    _paq: Array<(boolean | null | number | object | string | undefined)[]>;
    onloadTurnstileCallback: (() => void) | undefined;
    turnstile: TurnstileInstance | null | undefined;
  }
  const turnstile: TurnstileInstance;
}

export {};
