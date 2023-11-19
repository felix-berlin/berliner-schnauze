export const fetchAPI = async (query: string, { variables } = { variables: {} }) => {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${import.meta.env.PUBLIC_WP_AUTH_REFRESH_TOKEN}`,
  };

  return await fetch(import.meta.env.PUBLIC_WP_API, {
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
