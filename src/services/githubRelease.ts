import { GITHUB_API_TOKEN } from "astro:env/server";

const GITHUB_RELEASES_LIST_API =
  "https://api.github.com/repos/felix-berlin/berliner-schnauze/releases?per_page=5";
const FETCH_TIMEOUT_MS = 5000;

interface GithubRelease {
  assets?: { browser_download_url: string; name: string }[];
}

async function loadLiteDeckDownloadUrl(): Promise<string | undefined> {
  try {
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (GITHUB_API_TOKEN) headers.Authorization = `Bearer ${GITHUB_API_TOKEN}`;

    const res = await fetch(GITHUB_RELEASES_LIST_API, {
      headers,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.log(`GitHub releases request failed with status ${res.status}.`);
      return undefined;
    }

    const releases = (await res.json()) as GithubRelease[];
    // Der neueste Release kann kurz nach dem Publish noch ohne Asset dastehen
    // (der anki-release-Workflow braucht selbst noch einen Moment) - deshalb
    // wird der naechstaeltere durchsucht, statt nur /releases/latest zu nutzen.
    for (const release of releases) {
      const asset = release.assets?.find((a) => a.name.startsWith("Berliner-Schnauze-Anki-Deck-Lite"));
      if (asset) return asset.browser_download_url;
    }
    return undefined;
  } catch {
    console.log("GitHub release info could not be fetched.");
    return undefined;
  }
}

// Resolve once per process — the release doesn't change within a build/server lifetime.
let liteDeckUrlPromise: Promise<string | undefined> | undefined;
export const getLiteDeckDownloadUrl = (): Promise<string | undefined> =>
  (liteDeckUrlPromise ??= loadLiteDeckDownloadUrl());
