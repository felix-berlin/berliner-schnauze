import type { CollectionConfig } from "payload";

import { authenticated, usersCreate } from "../access";

export const Users: CollectionConfig = {
  slug: "users",
  access: { read: authenticated, create: usersCreate, update: authenticated, delete: authenticated },
  admin: { useAsTitle: "email" },
  auth: {
    useAPIKey: true,
    // Secure only behind https: the local compose cms runs NODE_ENV=production over http and would lose its login.
    cookies: { secure: process.env.PAYLOAD_SERVER_URL?.startsWith("https://") ?? false },
  },
  fields: [],
};
