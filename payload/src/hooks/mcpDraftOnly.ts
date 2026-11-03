import type { CollectionBeforeChangeHook } from "payload";

import { APIError } from "payload";

/**
 * Words reached through the MCP endpoint (`mcp.ts`) never go live: a write that publishes, or that edits a published
 * word without `draft: true`, is refused. The MCP tools default to `draft: false` and take `_status` as an argument,
 * so a leaked key could otherwise change the public site. `req.payloadAPI === "MCP"` is the documented way to tell
 * plugin-triggered calls apart (the plugin sets it on every request; the tools pass `req` on to the Local API).
 */
export const mcpDraftOnly: CollectionBeforeChangeHook = ({ data, req }) => {
  if (req.payloadAPI === "MCP" && data._status === "published") {
    throw new APIError(
      'Über MCP nur als Entwurf speichern: "draft": true setzen und kein "_status": "published".',
      403,
    );
  }
  return data;
};
