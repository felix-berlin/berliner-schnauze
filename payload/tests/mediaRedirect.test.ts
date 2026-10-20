import { handleEndpoints } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { wpUploadPath } from "../src/lib/wpUploadPath";
import { findMediaRedirect } from "../src/lib/findMediaRedirect";
import { getTestPayload } from "./helpers/payload";

describe("wpUploadPath", () => {
  it("strips query and decodes", () => {
    expect(wpUploadPath("https://cms.berliner-schnauze.wtf/wp-content/uploads/K%C3%BCche.jpg?ver=2")).toBe("Küche.jpg");
  });
  it("keeps subfolders", () => {
    expect(wpUploadPath("https://cms.berliner-schnauze.wtf/wp-content/uploads/2023/05/a.mp3")).toBe("2023/05/a.mp3");
  });
  it("handles a bare path", () => {
    expect(wpUploadPath("/wp-content/uploads/2023/a.png")).toBe("2023/a.png");
  });
});

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
let id: number | string;

beforeAll(async () => {
  process.env.PAYLOAD_SERVER_URL = "https://cms.example.test";
  const payload = await getTestPayload();
  const doc = await payload.create({
    collection: "media",
    data: { wpPath: "Küche.jpg" },
    file: { data: png, name: "redirect-kueche.png", mimetype: "image/png", size: png.length },
  });
  id = doc.id;
});
afterAll(async () => {
  const payload = await getTestPayload();
  await payload.delete({ collection: "media", id });
});

describe("findMediaRedirect", () => {
  it("returns an absolute URL for a known, encoded path", async () => {
    const payload = await getTestPayload();
    const url = await findMediaRedirect(payload, "/wp-content/uploads/K%C3%BCche.jpg?ver=2");
    expect(url).toBe("https://cms.example.test/api/media/file/redirect-kueche.png");
  });
  it("returns null for an unknown path", async () => {
    const payload = await getTestPayload();
    expect(await findMediaRedirect(payload, "/wp-content/uploads/nope.jpg")).toBeNull();
  });
});

describe("media files", () => {
  it("are served with a cache header (Payload sends none by default)", async () => {
    const payload = await getTestPayload();
    const res = await handleEndpoints({
      config: payload.config,
      request: new Request("http://localhost/api/media/file/redirect-kueche.png"),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=86400, stale-while-revalidate=604800");
  });
});
