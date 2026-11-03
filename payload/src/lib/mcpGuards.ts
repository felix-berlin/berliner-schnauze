/**
 * `onEvent` of the MCP handler as one audit line, or `null` for events not worth a line. Only the metadata is logged
 * (method, tool, document id, status, duration), never the tool arguments: they hold the documents themselves.
 */
export const mcpAuditLine = (event: unknown): string | null => {
  // REQUEST_COMPLETED carries the JSON-RPC request body as `result` (mcp-handler), so the tool sits in result.params
  const e = event as {
    type?: string;
    method?: string;
    status?: string;
    duration?: number;
    requestId?: string;
    result?: { params?: { name?: unknown; arguments?: { id?: unknown } } };
    error?: unknown;
  };
  if (e.type === "ERROR")
    return `[mcp] ${JSON.stringify({ type: "ERROR", requestId: e.requestId, error: String((e.error as Error)?.message ?? e.error) })}`;
  if (e.type !== "REQUEST_COMPLETED" || e.method !== "tools/call") return null;
  return `[mcp] ${JSON.stringify({
    method: e.method,
    tool: e.result?.params?.name,
    id: e.result?.params?.arguments?.id,
    status: e.status,
    ms: e.duration,
    requestId: e.requestId,
  })}`;
};
