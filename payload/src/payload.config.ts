import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";

import { Media } from "./collections/Media";
import { Pages } from "./collections/Pages";
import { Posts } from "./collections/Posts";
import { Themen } from "./collections/Themen";
import { Users } from "./collections/Users";
import { WordTypes } from "./collections/WordTypes";
import { Words } from "./collections/Words";
import { Affiliate } from "./globals/Affiliate";
import { Company } from "./globals/Company";
import { Navigation } from "./globals/Navigation";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
  },
  collections: [Users, Media, WordTypes, Themen, Words, Posts, Pages],
  globals: [Navigation, Affiliate, Company],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "",
  serverURL: process.env.PAYLOAD_SERVER_URL || "",
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL } }),
});
