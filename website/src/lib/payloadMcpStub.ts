// The site's bundle gets this instead of @payloadcms/plugin-mcp (alias in astro.config.mjs): the plugin pulls the
// TypeScript compiler into the bundle, which crashes on `__filename` in ESM. /api/mcp only runs on the cms host.
export const mcpPlugin = () => (config: unknown) => config;
