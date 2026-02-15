import fs from "fs";
import path from "path";

export async function refreshToken() {
  const { WP_AUTH_PASS, WP_AUTH_USER, WP_REST_API } = process.env;

  const response = await fetch(WP_REST_API + "/jwt-auth/v1/token", {
    body: JSON.stringify({
      password: WP_AUTH_PASS,
      username: WP_AUTH_USER,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Failed to refresh token:", errorData);
    throw new Error("Failed to refresh token");
  }

  const data = await response.json();
  const newToken = data.token;

  // Update the .env file with the new token
  const envFilePath = path.resolve(process.cwd(), ".env");
  const envFileContent = fs.readFileSync(envFilePath, "utf8");
  const updatedEnvFileContent = envFileContent.replace(
    /WP_AUTH_REFRESH_TOKEN=.*/,
    `WP_AUTH_REFRESH_TOKEN=${newToken}`,
  );
  fs.writeFileSync(envFilePath, updatedEnvFileContent);

  console.log("Token refreshed successfully:", newToken);
  console.warn("Make sure to add this token to the server environment as well!");

  return newToken;
}

refreshToken();
