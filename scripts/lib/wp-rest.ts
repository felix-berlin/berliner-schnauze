/**
 * WordPress REST API auth helper.
 * WP_REST_API env var = base URL including /wp-json (e.g. https://cms.example.com/wp-json).
 * All wp/v2 endpoints are constructed as ${baseUrl}/wp/v2${path}.
 */

export interface WpConfig {
  baseUrl: string;
  auth: string;
}

export function getWpConfig(): WpConfig {
  const baseUrl = process.env["WP_REST_API"];
  const user = process.env["WP_AUTH_USER"];
  const pass = process.env["WP_AUTH_PASS"];

  if (!baseUrl) throw new Error("WP_REST_API env var missing");
  if (!user) throw new Error("WP_AUTH_USER env var missing");
  if (!pass) throw new Error("WP_AUTH_PASS env var missing");

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    auth: Buffer.from(`${user}:${pass}`).toString("base64"),
  };
}

export async function wpFetch<T>(
  path: string,
  options: RequestInit = {},
  config?: WpConfig,
): Promise<T> {
  const { baseUrl, auth } = config ?? getWpConfig();
  const url = `${baseUrl}/wp/v2${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
      ...(options.headers as Record<string, string>),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "(no body)");
    throw new Error(`WP REST ${options.method ?? "GET"} ${url} → ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
