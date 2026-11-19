import type { Field } from "payload";

/** Sidebar link to the public page of a doc (words, posts, pages, themen), see `components/LiveLink.tsx`. */
export const liveLinkField: Field = {
  name: "liveLink",
  type: "ui",
  admin: { position: "sidebar", components: { Field: "@/components/LiveLink" } },
};
