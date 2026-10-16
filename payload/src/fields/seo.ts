import type { GroupField } from "payload";

export const seoField: GroupField = {
  name: "seo",
  type: "group",
  fields: [
    { name: "title", type: "text" },
    { name: "description", type: "textarea" },
    { name: "canonical", type: "text" },
    { name: "ogTitle", type: "text" },
    { name: "ogDescription", type: "text" },
    { name: "ogImage", type: "upload", relationTo: "media" },
    { name: "twitterTitle", type: "text" },
    { name: "twitterDescription", type: "text" },
    { name: "noindex", type: "checkbox" },
    { name: "nofollow", type: "checkbox" },
  ],
};
