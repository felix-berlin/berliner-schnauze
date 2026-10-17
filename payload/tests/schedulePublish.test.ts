import { afterEach, describe, expect, it } from "vitest";

import { getTestPayload } from "./helpers/payload";

const SLUG = "schedule-test-artikel";

afterEach(async () => {
  const payload = await getTestPayload();
  await payload.delete({ collection: "posts", where: { slug: { equals: SLUG } } });
  await payload.delete({ collection: "payload-jobs", where: { taskSlug: { equals: "schedulePublish" } } });
});

describe("scheduled publishing of posts", () => {
  it("publishes a draft once its job is due and the queue runs", async () => {
    const payload = await getTestPayload();
    const post = await payload.create({ collection: "posts", data: { title: "Geplant", slug: SLUG, wpId: 990401 } });
    expect(post._status).toBe("draft");

    await payload.jobs.queue({
      input: { doc: { relationTo: "posts", value: String(post.id) }, type: "publish" },
      task: "schedulePublish",
      waitUntil: new Date(Date.now() - 1000),
    });
    await payload.jobs.run({ queue: "default" });

    const stored = await payload.findByID({ collection: "posts", id: post.id, depth: 0 });
    expect(stored._status).toBe("published");
  });
});
