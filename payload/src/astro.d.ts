// Types-only view of this package for the Astro app's typecheck (the `types` condition of this package's `exports`).
// The real entry (index.ts) imports payload.config and the migrations, which the root tsconfig would then
// compile with its own, stricter options. Runtime resolution is unaffected: Vite uses `exports`.
import type { Payload, SanitizedConfig } from "payload";

export type * from "./payload-types";
export type { Payload };
export declare const config: Promise<SanitizedConfig>;
export declare const getPayload: (options: { config: Promise<SanitizedConfig> | SanitizedConfig }) => Promise<Payload>;
