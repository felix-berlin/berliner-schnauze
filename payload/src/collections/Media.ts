import type { CollectionConfig } from "payload";

import { authenticated, mediaRead } from "../access";

export const Media: CollectionConfig = {
  slug: "media",
  access: { read: mediaRead, create: authenticated, update: authenticated, delete: authenticated },
  upload: { staticDir: process.env.MEDIA_DIR ?? "media", mimeTypes: ["image/*", "audio/*"] },
  fields: [
    { name: "alt", type: "text" },
    { name: "caption", type: "text" },
    { name: "description", type: "richText" },
    // Old /wp-content/uploads path: drives the permanent media 301s (findMediaRedirect), keep it.
    { name: "wpPath", type: "text", unique: true, index: true, admin: { readOnly: true } },
  ],
};
