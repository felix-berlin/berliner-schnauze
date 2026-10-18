import { afterAll, expect, it } from "vitest";

import { getTestPayload } from "./helpers/payload";

afterAll(async () => {
  const payload = await getTestPayload();
  await payload.delete({ collection: "users", where: { email: { equals: "bot@test.local" } } });
});

it("boots and creates an API-key user", async () => {
  const payload = await getTestPayload();
  const user = await payload.create({
    collection: "users",
    data: { email: "bot@test.local", password: "x".repeat(16), enableAPIKey: true, apiKey: "k-test" },
  });
  expect(user.enableAPIKey).toBe(true);
});
