/**
 * Payload REST helper for maintenance scripts.
 * PAYLOAD_URL = CMS base URL (e.g. https://cms.berliner-schnauze.wtf), PAYLOAD_API_KEY = API key of a
 * Payload user (Admin -> Users -> "Enable API Key"). The API is closed to anonymous reads and writes.
 */

const TIMEOUT_MS = 15_000;

function getPayloadConfig(): { apiKey: string; baseUrl: string } {
  const baseUrl = process.env["PAYLOAD_URL"];
  const apiKey = process.env["PAYLOAD_API_KEY"];
  if (!baseUrl) throw new Error("PAYLOAD_URL env var missing");
  if (!apiKey) throw new Error("PAYLOAD_API_KEY env var missing");
  return { apiKey, baseUrl: baseUrl.replace(/\/$/, "") };
}

export async function payloadFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { apiKey, baseUrl } = getPayloadConfig();
  const url = `${baseUrl}/api${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `users API-Key ${apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "(failed to read body)");
    throw new Error(`Payload ${options.method ?? "GET"} ${url} → ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}
