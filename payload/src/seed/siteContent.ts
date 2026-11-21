import type { Payload, PayloadRequest } from "payload";

import { sql } from "@payloadcms/db-postgres";

import { htmlToLexical } from "../lib/htmlToLexical";

/** What /anki, the home page and /spenden showed while these texts lived in the Astro pages. */
export const ANKI_CONTENT = {
  steps: [
    {
      title: "Karte sehen",
      text: "Anki zeigt Dir ein Berliner Wort. Du überlegst kurz: Wat heißt ditt nochmal?",
    },
    {
      title: "Aufdecken",
      text: "Du drehst die Karte um und siehst Bedeutung und Beispielsatz. Jetzt weißte, ob Du richtig lagst.",
    },
    {
      title: "Ehrlich bewerten",
      text: "Nochmal, Schwer, Gut oder Einfach. Danach entscheidet Anki, wann die Karte wiederkommt.",
    },
  ],
  liteFeatures: [
    { text: "{liteWords} Wörter — rund 10 % vom Wortschatz" },
    { text: "Quer durch alle Buchstaben von A bis Z" },
    { text: "Sofort kostenlos laden, ohne Anmeldung" },
    { text: "Perfekter Einstieg, um Anki kennenzulernen" },
  ],
  fullFeatures: [
    { text: "Der komplette Wortschatz: {totalWords} Wörter" },
    { text: "Fügt sich nahtlos in Deine Lite-Version ein" },
    { text: "Lernfortschritt bleibt, keine Dopplungen" },
    { text: "Einmal zahlen, kein Abo — neue Wörter kommen gratis dazu" },
    { text: "Nur für Dich — Weitergabe nicht erlaubt" },
  ],
  faqs: [
    {
      question: "Brauch ich Anki dafür?",
      answer:
        "Ja. Anki ist die App, in der Du das Deck lernst. Für Windows, macOS, Linux, Android und im Browser ist sie kostenlos, für iPhone und iPad gibt's AnkiMobile als Kauf-App. Einmal installieren, Deck-Datei (.apkg) öffnen, fertig.",
    },
    {
      question: "Wie installiere und importiere ich das Deck?",
      answer:
        "Anki von apps.ankiweb.net herunterladen und installieren. Die heruntergeladene .apkg-Datei doppelklicken — oder in Anki über „Datei → Importieren“ auswählen. Das Deck „Berliner Schnauze“ erscheint in Deiner Deckliste. Draufklicken, „Jetzt lernen“, fertig.",
    },
    {
      question: "Wie update ich von Lite auf Full?",
      answer:
        "Einfach die Full-Datei (.apkg) genauso importieren wie vorher die Lite. Anki erkennt die vorhandenen Karten, behält Deinen Lernstand und fügt nur die fehlenden Wörter hinzu. Du musst nichts löschen.",
    },
    {
      question: "Verliere ich meinen Fortschritt, wenn ich von Lite auf Full wechsle?",
      answer:
        "Nee. Die Full ist so gebaut, dass sie sich in Dein bestehendes Lite-Deck einfügt. Karten, die Du schon hast, bleiben mit ihrem Lernstand erhalten — es kommen nur die fehlenden dazu, ohne Dopplungen.",
    },
    {
      question: "Welche Wörter sind in der Lite?",
      answer:
        "Rund 10 % des gesamten Wortschatzes, gleichmäßig über alle Buchstaben verteilt. So kriegst Du einen ehrlichen Eindruck vom ganzen Deck.",
    },
    {
      question: "Wie bezahle ich die Full?",
      answer:
        "Der Kauf läuft über Polar. Nach dem Klick auf „Full-Deck kaufen“ wirst Du dorthin weitergeleitet und bekommst das Deck nach der Zahlung zum Download.",
    },
    {
      question: "Kriege ich neue Wörter, wenn das Wörterbuch wächst?",
      answer:
        "Na klar, die Updates sind im einmaligen Kauf mit drin. Ruf einfach den Download-Link aus Deiner Kauf-Mail nochmal auf, lade die aktuelle Datei runter und importier sie in Anki. Neue Wörter kommen dazu, Dein Lernstand bleibt, doppelte Karten gibt’s keine.",
    },
    {
      question: "Darf ich die Full an Freunde weitergeben?",
      answer:
        "Leider nein. Die Full ist nur für Dich — Weitergabe, Weiterverkauf oder Veröffentlichung sind nicht erlaubt. Die Lite darfste dagegen gerne teilen.",
    },
  ],
};

/** Fact texts as HTML; stored as rich text. */
export const HOME_FACTS = [
  {
    headline: "Häufig kürzer als Hochdeutsch",
    html: 'Wir Berliner halten uns kurz, einfache Vokale sprechen wa meist verkürzt aus. Aus "mal" wird z.B. "ma".',
  },
  {
    headline: "Wie verbreitet ist Berlinisch?",
    html: "Dialekt sprechen in Berlin bei weitem nicht alle. Laut <a href='https://de.statista.com/statistik/daten/studie/1116703/umfrage/verbreitung-berliner-dialekt/'>dieser Umfrage</a> sprechen bis zu <strong>62%</strong> der Berliner im heimischen Dialekt.",
  },
  {
    headline: "Ausgetauschte Wortendungen",
    html: "Wortendungen auf <strong>'-er'</strong> werden von uns konsequent durch <strong>'a'</strong> ausgetauscht: 'seiner' -> 'seina', 'Alter' -> 'Alta'",
  },
  {
    headline: "Viele Bezeichnungen für ein und das Selbe",
    html: "Der Berliner Metrolekt wird häufig auch als <strong>Berlinisch</strong>, <strong>Berliner Jargon</strong>, <strong>Berlinerisch</strong> oder <strong>Berliner Mundart</strong> bezeichnet.",
  },
  {
    headline: "Ist Berlinerisch ein Dialekt?",
    html: "Sprachwissenschaftlich gesehen ist Berlinerisch <strong>kein Dialekt</strong>, sondern ein <strong><a href='https://www.wikiwand.com/de/Metrolekt'>Metrolekt</a></strong>. Eine in großstädtischen Zentren entstehende Stadtsprache.",
  },
];

export const DONATION_HIGHLIGHTS = ["Keene Werbung", "Keene Tracker", "Open Source"];

/** Fills the anki and home globals and the donation highlights with the texts above. */
export async function seedSiteContent(
  payload: Payload,
  req: Partial<PayloadRequest> | undefined,
  // The migration's own handle (its transaction sees the tables it just created).
  db: { execute: (query: ReturnType<typeof sql>) => Promise<unknown> },
): Promise<void> {
  const facts = [];
  for (const { headline, html } of HOME_FACTS) {
    // oxlint-disable-next-line no-await-in-loop -- five short facts
    facts.push({ headline, text: await htmlToLexical(`<p>${html}</p>`, payload.config) });
  }
  await payload.updateGlobal({ slug: "anki", data: ANKI_CONTENT, req });
  // Raw SQL, not the Local API: this runs inside an old migration, and the Local API reads every `home` column,
  // including those later migrations add (a fresh database would fail here). Only when no `home` row exists yet:
  // a restored dump or a repeated run must not create a second singleton.
  const existing = (await db.execute(sql`SELECT "id" FROM "home" LIMIT 1`)) as {
    rows: unknown[];
  };
  if (!existing.rows.length) await insertHome(db, facts);
  await payload.updateGlobal({
    slug: "company",
    data: { donationHighlights: DONATION_HIGHLIGHTS },
    req,
  });
}

async function insertHome(
  db: { execute: (query: ReturnType<typeof sql>) => Promise<unknown> },
  facts: { headline: string; text: unknown }[],
): Promise<void> {
  const { rows } = (await db.execute(
    sql`INSERT INTO "home" ("updated_at", "created_at") VALUES (now(), now()) RETURNING "id"`,
  )) as { rows: { id: number }[] };
  const homeId = rows[0]?.id;
  if (homeId === undefined) throw new Error("seedSiteContent: the home insert returned no id");
  for (const [i, fact] of facts.entries()) {
    // oxlint-disable-next-line no-await-in-loop -- five rows
    await db.execute(
      sql`INSERT INTO "home_facts" ("_order", "_parent_id", "id", "headline", "text") VALUES (${i + 1}, ${homeId}, ${crypto.randomUUID()}, ${fact.headline}, ${JSON.stringify(fact.text)}::jsonb)`,
    );
  }
}
