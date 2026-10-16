import type { CollectionConfig } from "payload";

import { anyone, authenticated } from "../access";

export const Media: CollectionConfig = {
  slug: "media",
  access: { read: anyone, create: authenticated, update: authenticated, delete: authenticated },
  upload: { staticDir: process.env.MEDIA_DIR ?? "media", mimeTypes: ["image/*", "audio/*"] },
  fields: [
    { name: "alt", type: "text" },
    { name: "caption", type: "text" },
    { name: "wpPath", type: "text", unique: true, index: true, admin: { readOnly: true } },
  ],
};
