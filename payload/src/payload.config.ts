import { postgresAdapter } from "@payloadcms/db-postgres";
import { nodemailerAdapter } from "@payloadcms/email-nodemailer";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import nodemailer from "nodemailer";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";

import { Media } from "./collections/Media";
import { Pages } from "./collections/Pages";
import { Posts } from "./collections/Posts";
import { Suggestions } from "./collections/Suggestions";
import { Themen } from "./collections/Themen";
import { Users } from "./collections/Users";
import { WordTypes } from "./collections/WordTypes";
import { Words } from "./collections/Words";
import { Affiliate } from "./globals/Affiliate";
import { Company } from "./globals/Company";
import { Navigation } from "./globals/Navigation";
import { migrations } from "./migrations";
import { redirects } from "./redirects";
import { seo } from "./seo";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
  },
  collections: [Users, Media, WordTypes, Themen, Words, Posts, Pages, Suggestions],
  globals: [Navigation, Affiliate, Company],
  editor: lexicalEditor(),
  // Without SMTP_URL (dev, tests) Payload writes mails to the console instead of sending them.
  email: process.env.SMTP_URL
    ? nodemailerAdapter({
        // The site stays the sender (SPF); a suggester is only the reply target.
        defaultFromAddress: "mail@berliner-schnauze.wtf",
        defaultFromName: "Berliner Schnauze",
        skipVerify: true,
        transport: nodemailer.createTransport(process.env.SMTP_URL),
      })
    : undefined,
  plugins: [seo, redirects],
  secret: process.env.PAYLOAD_SECRET || "",
  serverURL: process.env.PAYLOAD_SERVER_URL || "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
    // Becomes the default in v4: with `draft: true`, required fields are typed optional.
    strictDraftTypes: true,
  },
  // Dev/tests push the schema; in production nothing is pushed and the committed migrations run on
  // start only where PAYLOAD_RUN_MIGRATIONS=true (the cms container), so no second app migrates concurrently.
  // Every schema change needs `payload migrate:create <name>`.
  db: postgresAdapter({
    // A database that is down must fail a request fast instead of hanging it (pg waits forever by default).
    pool: { connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 },
    prodMigrations: process.env.PAYLOAD_RUN_MIGRATIONS === "true" ? migrations : undefined,
  }),
});
