const GITHUB_RELEASES_API =
  "https://api.github.com/repos/felix-berlin/berliner-schnauze/releases/latest";
const FETCH_TIMEOUT_MS = 5000;

interface GithubRelease {
  assets?: { browser_download_url: string; name: string }[];
}

async function loadLiteDeckDownloadUrl(): Promise<string | undefined> {
  try {
    const res = await fetch(GITHUB_RELEASES_API, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.log(`GitHub releases request failed with status ${res.status}.`);
      return undefined;
    }

    const release = (await res.json()) as GithubRelease;
    return release.assets?.find((asset) => asset.name.startsWith("berlinerisch-lite"))
      ?.browser_download_url;
  } catch {
    console.log("GitHub release info could not be fetched.");
    return undefined;
  }
}

// Resolve once per process — the release doesn't change within a build/server lifetime.
let liteDeckUrlPromise: Promise<string | undefined> | undefined;
export const getLiteDeckDownloadUrl = (): Promise<string | undefined> =>
  (liteDeckUrlPromise ??= loadLiteDeckDownloadUrl());
