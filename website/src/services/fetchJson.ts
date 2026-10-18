const FETCH_TIMEOUT_MS = 5000;

/**
 * JSON fetch for optional third-party data: times out after 5 s and logs +
 * returns undefined on any failure, so a flaky API never breaks a page render.
 */
export async function fetchJson<T>(
  url: string,
  headers: Record<string, string>,
  label: string,
): Promise<T | undefined> {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (res.ok) return (await res.json()) as T;
    console.log(`${label} request failed with status ${res.status}.`);
  } catch {
    console.log(`${label} could not be fetched.`);
  }
  return undefined;
}
