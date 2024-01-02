export const fetchWikimediaAPI = async (file: string) => {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: import.meta.env.WIKIMEDIA_API_AUTH_TOKEN,
    "User-Agent": "Berliner Schnauze",
  };

  const baseUrl = "https://api.wikimedia.org/core/v1/commons/file/";
  const url = `${baseUrl}${file}`;

  return await fetch(url, {
    method: "GET",
    headers,
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
