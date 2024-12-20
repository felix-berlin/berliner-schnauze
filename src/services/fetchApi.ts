import { WP_AUTH_REFRESH_TOKEN, WP_API } from "astro:env/client";

export const fetchAPI = async (query: string, { variables } = { variables: {} }) => {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${WP_AUTH_REFRESH_TOKEN}`,
  };

  return await fetch(WP_API, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
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
