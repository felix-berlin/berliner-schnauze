import { WIKIMEDIA_API_AUTH_TOKEN } from "astro:env/client";

const loadWikimediaFile = async (file: string) => {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": "Berliner Schnauze",
  };
  if (WIKIMEDIA_API_AUTH_TOKEN) {
    headers.Authorization = WIKIMEDIA_API_AUTH_TOKEN;
  }

  const baseUrl = "https://api.wikimedia.org/core/v1/commons/file/";
  const url = `${baseUrl}${file}`;

  return await fetch(url, {
    headers,
    method: "GET",
  })
    .then(async (response) => {
      if (response.ok) {
        // console.log("response", response.headers);

        return await response.json();
      } else {
        const errorMessage = await response.text();
        return Promise.reject(new Error(errorMessage));
      }
    })
    .catch((error) => {
      console.error("error", error);
    });
};

// On-demand word pages ask for the same files on every request: keep results for a day, never a failure.
const DAY = 24 * 60 * 60 * 1000;
// The pending promise is cached too, so concurrent requests for one file share a single fetch.
const cache = new Map<string, { at: number; value: Promise<unknown> }>();

export const fetchWikimediaAPI = (file: string) => {
  const hit = cache.get(file);
  if (hit && Date.now() - hit.at < DAY) return hit.value;
  const value = loadWikimediaFile(file);
  cache.set(file, { at: Date.now(), value });
  void value.then((result) => {
    if (result === undefined && cache.get(file)?.value === value) cache.delete(file);
  });
  return value;
};
