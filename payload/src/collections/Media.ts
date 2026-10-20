import type { CollectionConfig } from "payload";

import { authenticated, mediaRead } from "../access";

export const Media: CollectionConfig = {
  slug: "media",
  access: { read: mediaRead, create: authenticated, update: authenticated, delete: authenticated },
  upload: {
    staticDir: process.env.MEDIA_DIR ?? "media",
    mimeTypes: ["image/*", "audio/*"],
    // Payload sends files without any cache header, so browsers fetched every audio again. A day, not immutable:
    // a file replaced under the same name shows up by the next day.
    modifyResponseHeaders: ({ headers }) => {
      headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    },
  },
  fields: [
    { name: "alt", type: "text" },
    { name: "caption", type: "text" },
    { name: "description", type: "richText" },
    // Old /wp-content/uploads path: drives the permanent media 301s (findMediaRedirect), keep it.
    { name: "wpPath", type: "text", unique: true, index: true, admin: { readOnly: true } },
  ],
};
