import type { CollectionConfig } from "payload";

import { authenticated, usersCreate } from "../access";

export const Users: CollectionConfig = {
  slug: "users",
  access: { read: authenticated, create: usersCreate, update: authenticated, delete: authenticated },
  admin: { useAsTitle: "email" },
  auth: { useAPIKey: true },
  fields: [],
};
