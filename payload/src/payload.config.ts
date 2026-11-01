import { postgresAdapter } from "@payloadcms/db-postgres";
import { nodemailerAdapter } from "@payloadcms/email-nodemailer";
import { LinkFeature, lexicalEditor } from "@payloadcms/richtext-lexical";
import os from "os";
import path from "path";
import nodemailer from "nodemailer";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";

import { CommentReports } from "./collections/CommentReports";
import { Comments } from "./collections/Comments";
import { CommentVotes } from "./collections/CommentVotes";
import { Media } from "./collections/Media";
import { Pages } from "./collections/Pages";
import { Posts } from "./collections/Posts";
import { Suggestions } from "./collections/Suggestions";
import { Themen } from "./collections/Themen";
import { Users } from "./collections/Users";
import { WordTypes } from "./collections/WordTypes";
import { Words } from "./collections/Words";
import { Affiliate } from "./globals/Affiliate";
import { Anki } from "./globals/Anki";
import { Company } from "./globals/Company";
import { Home } from "./globals/Home";
import { Navigation } from "./globals/Navigation";
import { withIndexNow } from "./hooks/indexNow";
import { withSlugRedirects } from "./hooks/redirectOldSlug";
import { migrations } from "./migrations";
import { redirects } from "./redirects";
import { seo } from "./seo";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  // Nothing uses GraphQL (the site reads through the Local API, scripts through REST): disabled, Payload builds no
  // schema at init, in the cms and in the site's Local API process alike.
  graphQL: { disable: true },
  // Uploads go to a temp file instead of RAM (up to 3 × 20 MB per request by default): the cms container is capped
  // at 512 MB.
  upload: { useTempFiles: true, tempFileDir: os.tmpdir() },
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
  },
  // A slug change on a collection with a public page adds a 301 from the old path.
  collections: [Users, Media, WordTypes, Themen, Words, Posts, Pages, Suggestions, Comments, CommentVotes, CommentReports].map(withSlugRedirects).map(withIndexNow),
  globals: [Navigation, Affiliate, Company, Home, Anki],
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [
      ...defaultFeatures,
      LinkFeature({
        fields: ({ defaultFields }) => [
          ...defaultFields,
          // Rendered as rel="sponsored": the site labels such links „Anzeige“ and shows the affiliate notice.
          { name: "sponsored", type: "checkbox", label: "Werbelink (Affiliate)", admin: { description: "Wird als „Anzeige“ gekennzeichnet." } },
        ],
      }),
    ],
  }),
  // Without SMTP_URL (dev, tests) Payload writes mails to the console instead of sending them.
  email: process.env.SMTP_URL
    ? nodemailerAdapter({
        // The site stays the sender (SPF); a suggester is only the reply target.
        defaultFromAddress: "mail@berliner-schnauze.wtf",
        defaultFromName: "Berliner Schnauze",
        skipVerify: true,
        // A hung SMTP server must not pile up sockets (defaults: 2 min connect, 10 min idle).
        transport: nodemailer.createTransport({
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 20_000,
          url: process.env.SMTP_URL,
        }),
      })
    : undefined,
  plugins: [seo, redirects],
  // Runs queued jobs (scheduled publishing of posts) only where PAYLOAD_RUN_JOBS=true, the cms container: the site's
  // Local API process must not pick them up as well.
  jobs: {
    autoRun: process.env.PAYLOAD_RUN_JOBS === "true" ? [{ cron: "* * * * *", queue: "default" }] : undefined,
  },
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
