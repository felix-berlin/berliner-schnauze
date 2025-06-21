import { WP_API, WP_AUTH_REFRESH_TOKEN } from "astro:env/client";

export const fetchAPI = async (query: string, { variables } = { variables: {} }) => {
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${WP_AUTH_REFRESH_TOKEN}`,
    "Content-Type": "application/json",
  };

  return await fetch(WP_API, {
    body: JSON.stringify({ query, variables }),
    headers,
    method: "POST",
  })
    .then(async (response) => {
      if (response.ok) {
        // console.log("response", response);

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
