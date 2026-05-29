import { WIKIMEDIA_API_AUTH_TOKEN } from "astro:env/client";

export const fetchWikimediaAPI = async (file: string) => {
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
