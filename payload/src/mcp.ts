import { mcpPlugin } from "@payloadcms/plugin-mcp";

import { version } from "../package.json";

/**
 * MCP endpoint (`/api/mcp`) so Claude can read and maintain words and suggestions. Auth is a per-user API key made in
 * the admin; the tools run with that user's access. No delete, and no users/comments/media: widen only on demand.
 * Words stay drafts (hooks/mcpDraftOnly): publishing is an editor's step in the admin.
 */
export const mcp = mcpPlugin({
  // Kill switch without a schema change (the keys table stays): MCP_DISABLED=true on the cms container.
  disabled: process.env.MCP_DISABLED === "true",
  mcp: { serverOptions: { serverInfo: { name: "Berliner Schnauze CMS", version } } },
  collections: {
    words: {
      enabled: { find: true, create: true, update: true },
      description: "Berliner Wörter (Entwürfe und veröffentlicht). Abgeleitete Felder (derived) berechnet das CMS beim Speichern.",
    },
    suggestions: {
      // No create: the site's form makes suggestions, and every create mails the editors.
      enabled: { find: true, update: true },
      description: "Wortvorschläge aus dem Formular. status: new | accepted | rejected; word verweist auf das daraus entstandene Wort.",
    },
  },
});
