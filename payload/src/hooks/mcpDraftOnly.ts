import type { CollectionBeforeChangeHook, CollectionBeforeOperationHook } from "payload";

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

/**
 * An MCP update must save as a draft version: with `draft: false` plus `_status: "draft"` the beforeChange check above
 * passes, but Payload writes the main row and so unpublishes and overwrites the live word (also in bulk via `where`).
 * Only beforeOperation sees `args.draft`.
 */
export const mcpUpdateDraftOnly: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (req.payloadAPI === "MCP" && operation === "update" && args.draft !== true) {
    throw new APIError('Über MCP nur als Entwurf speichern: "draft": true setzen.', 403);
  }
  return args;
};
