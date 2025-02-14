import "dotenv/config";
import fs from "fs";
import path from "path";

export async function refreshToken() {
  const { WP_REST_API, WP_AUTH_USER, WP_AUTH_PASS } = process.env;

  const response = await fetch(WP_REST_API + "/jwt-auth/v1/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: WP_AUTH_USER,
      password: WP_AUTH_PASS,
    }),
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
