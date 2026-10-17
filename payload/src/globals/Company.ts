import type { GlobalConfig } from "payload";

import { authenticatedGlobal } from "../access";

export const Company: GlobalConfig = {
  slug: "company",
  access: authenticatedGlobal,
  fields: [
    {
      name: "platforms",
      type: "array",
      admin: { description: "Spenden-Plattformen (Footer und /spenden)." },
      fields: [
        { name: "name", type: "text", required: true },
        { name: "link", type: "text", required: true },
      ],
    },
    {
      name: "wallets",
      type: "array",
      admin: { description: "Krypto-Adressen; eine Adresse kann auf mehreren Chains gelten." },
      fields: [
        { name: "address", type: "text", required: true },
        { name: "chains", type: "text", hasMany: true, required: true },
      ],
    },
    {
      name: "donationHighlights",
      type: "text",
      hasMany: true,
      admin: { description: "Kurze Versprechen oben auf /spenden, z. B. „Keene Werbung“." },
    },
    {
      name: "socialMedia",
      type: "array",
      fields: [
        { name: "label", type: "text", required: true },
        { name: "profile", type: "text", required: true },
        { name: "relMe", type: "checkbox", admin: { description: 'Link mit rel="me" (z. B. Mastodon-Verifizierung).' } },
      ],
    },
  ],
};
