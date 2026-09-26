import { fetchJson } from "@services/fetchJson.ts";
import { GITHUB_API_TOKEN } from "astro:env/server";

const GITHUB_RELEASES_LIST_API =
  "https://api.github.com/repos/felix-berlin/berliner-schnauze/releases?per_page=5";

interface GithubRelease {
  assets?: { browser_download_url: string; name: string }[];
}

async function loadLiteDeckDownloadUrl(): Promise<string | undefined> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (GITHUB_API_TOKEN) headers.Authorization = `Bearer ${GITHUB_API_TOKEN}`;

  const releases = await fetchJson<GithubRelease[]>(
    GITHUB_RELEASES_LIST_API,
    headers,
    "GitHub releases",
  );
  // Der neueste Release kann kurz nach dem Publish noch ohne Asset dastehen
  // (der anki-release-Workflow braucht selbst noch einen Moment) - deshalb
  // wird der naechstaeltere durchsucht, statt nur /releases/latest zu nutzen.
  for (const release of releases ?? []) {
    const asset = release.assets?.find((a) =>
      a.name.startsWith("Berliner-Schnauze-Anki-Deck-Lite"),
    );
    if (asset) return asset.browser_download_url;
  }
  return undefined;
}

// Resolve once per process — the release doesn't change within a build/server lifetime.
let liteDeckUrlPromise: Promise<string | undefined> | undefined;
export const getLiteDeckDownloadUrl = (): Promise<string | undefined> =>
  (liteDeckUrlPromise ??= loadLiteDeckDownloadUrl());
