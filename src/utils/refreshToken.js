import fs from "fs";
import path from "path";

export async function refreshToken() {
  const { WP_AUTH_PASS, WP_AUTH_USER, WP_REST_API } = process.env;

  // Validate required environment variables
  const missingVars = [];
  if (!WP_AUTH_USER) missingVars.push("WP_AUTH_USER");
  if (!WP_AUTH_PASS) missingVars.push("WP_AUTH_PASS");
  if (!WP_REST_API) missingVars.push("WP_REST_API");

  if (missingVars.length > 0) {
    console.error(
      `Error: Missing required environment variables: ${missingVars.join(", ")}`,
    );
    console.error(
      "\nPlease use the package manager script: pnpm run refreshAuthToken",
    );
    console.error(
      "Or run with: node --env-file=.env ./src/utils/refreshToken.js",
    );
    process.exit(1);
  }

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
