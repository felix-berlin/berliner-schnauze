/** Fields of a suggestion that identify the sender: the MCP client (and so the model) never needs them. */
const SUGGESTION_PRIVATE_FIELDS = ["userName", "userMail"];

type McpResponse = { content: { text: string; type: string }[] };

/**
 * `overrideResponse` for `suggestions`: strips the sender's name and mail from every JSON document in a tool response.
 * The plugin writes each document as `JSON.stringify(doc)` on a line of its own (find, findByID, update), so this works
 * per line and leaves anything that does not parse as a JSON object untouched.
 */
export const redactSuggestionResponse = (response: McpResponse): McpResponse => ({
  ...response,
  content: response.content.map((part) => ({
    ...part,
    text: part.text
      .split("\n")
      .map((line) => {
        if (!line.startsWith("{")) return line;
        try {
          const doc = JSON.parse(line) as Record<string, unknown>;
          for (const field of SUGGESTION_PRIVATE_FIELDS) delete doc[field];
          return JSON.stringify(doc);
        } catch {
          return line;
        }
      })
      .join("\n"),
  })),
});

/**
 * `onEvent` of the MCP handler as one audit line, or `null` for events not worth a line. Only the metadata is logged
 * (method, tool, document id, status, duration): `parameters` and `result` hold the documents themselves.
 */
export const mcpAuditLine = (event: unknown): string | null => {
  const e = event as {
    type?: string;
    method?: string;
    status?: string;
    duration?: number;
    requestId?: string;
    parameters?: { name?: unknown; arguments?: { id?: unknown } };
    error?: unknown;
  };
  if (e.type === "ERROR")
    return `[mcp] ${JSON.stringify({ type: "ERROR", requestId: e.requestId, error: String((e.error as Error)?.message ?? e.error) })}`;
  if (e.type !== "REQUEST_COMPLETED" || e.method !== "tools/call") return null;
  return `[mcp] ${JSON.stringify({
    method: e.method,
    tool: e.parameters?.name,
    id: e.parameters?.arguments?.id,
    status: e.status,
    ms: e.duration,
    requestId: e.requestId,
  })}`;
};
