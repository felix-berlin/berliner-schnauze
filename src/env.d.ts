/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
declare module "@pagefind/default-ui";

interface ImportMetaEnv {
  readonly API_BASE: string;
  readonly PUBLIC_WP_API: string;
  readonly PUBLIC_WP_REST_API: string;
  readonly WEBMENTION_URL: string;
  readonly PUBLIC_LAST_FM_SCROBBLER_API: string;
  readonly ENABLE_ANALYTICS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
