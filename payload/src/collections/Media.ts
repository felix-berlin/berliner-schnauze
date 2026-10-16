import type { CollectionConfig } from "payload";

import { authenticated, mediaRead } from "../access";

export const Media: CollectionConfig = {
  slug: "media",
  access: { read: mediaRead, create: authenticated, update: authenticated, delete: authenticated },
  upload: { staticDir: process.env.MEDIA_DIR ?? "media", mimeTypes: ["image/*", "audio/*"] },
  fields: [
    { name: "alt", type: "text" },
    { name: "caption", type: "text" },
    { name: "description", type: "textarea" },
    { name: "wpPath", type: "text", unique: true, index: true, admin: { readOnly: true } },
  ],
};
