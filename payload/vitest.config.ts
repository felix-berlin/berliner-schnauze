import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Tests never send real mail, even when Infisical dev carries an SMTP_URL: Payload then logs mails to the console.
    env: { SMTP_URL: "" },
    include: ["tests/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
