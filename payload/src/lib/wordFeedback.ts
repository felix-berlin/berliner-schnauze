// Shared feedback options and counts (`payload-app/word-feedback`): no payload/next/config runtime imports.
import type { BasePayload, Where } from "payload";

export const REACTIONS = ["like", "dislike"] as const;
export const USAGES = ["say", "know", "never"] as const;
export const AREAS = [
  "mitte",
  "friedrichshain-kreuzberg",
  "pankow",
  "charlottenburg-wilmersdorf",
  "spandau",
  "steglitz-zehlendorf",
  "tempelhof-schoeneberg",
  "neukoelln",
  "treptow-koepenick",
  "marzahn-hellersdorf",
  "lichtenberg",
  "reinickendorf",
  "brandenburg",
  "elsewhere",
] as const;
export const ORIGINS = ["grewUp", "movedOver10", "movedUnder10"] as const;
export const HALVES = ["east", "west", "both"] as const;
export const AGES = [
  "u20",
  "20-29",
  "30-39",
  "40-49",
  "50-59",
  "60-69",
  "70-79",
  "80plus",
] as const;
/** The 97 localities (Ortsteile) per borough (Bezirk), spelling as on de.wikipedia "Verwaltungsgliederung Berlins": key -> name. */
export const AREA_LOCALITIES = {
  mitte: {
    mitte: "Mitte",
    moabit: "Moabit",
    hansaviertel: "Hansaviertel",
    tiergarten: "Tiergarten",
    wedding: "Wedding",
    gesundbrunnen: "Gesundbrunnen",
  },
  "friedrichshain-kreuzberg": {
    friedrichshain: "Friedrichshain",
    kreuzberg: "Kreuzberg",
  },
  pankow: {
    "prenzlauer-berg": "Prenzlauer Berg",
    weissensee: "Weißensee",
    blankenburg: "Blankenburg",
    heinersdorf: "Heinersdorf",
    karow: "Karow",
    "stadtrandsiedlung-malchow": "Stadtrandsiedlung Malchow",
    pankow: "Pankow",
    blankenfelde: "Blankenfelde",
    buch: "Buch",
    "franzoesisch-buchholz": "Französisch Buchholz",
    niederschoenhausen: "Niederschönhausen",
    rosenthal: "Rosenthal",
    wilhelmsruh: "Wilhelmsruh",
  },
  "charlottenburg-wilmersdorf": {
    charlottenburg: "Charlottenburg",
    wilmersdorf: "Wilmersdorf",
    schmargendorf: "Schmargendorf",
    grunewald: "Grunewald",
    westend: "Westend",
    "charlottenburg-nord": "Charlottenburg-Nord",
    halensee: "Halensee",
  },
  spandau: {
    spandau: "Spandau",
    haselhorst: "Haselhorst",
    siemensstadt: "Siemensstadt",
    staaken: "Staaken",
    gatow: "Gatow",
    kladow: "Kladow",
    hakenfelde: "Hakenfelde",
    "falkenhagener-feld": "Falkenhagener Feld",
    wilhelmstadt: "Wilhelmstadt",
  },
  "steglitz-zehlendorf": {
    steglitz: "Steglitz",
    lichterfelde: "Lichterfelde",
    lankwitz: "Lankwitz",
    zehlendorf: "Zehlendorf",
    dahlem: "Dahlem",
    nikolassee: "Nikolassee",
    wannsee: "Wannsee",
    schlachtensee: "Schlachtensee",
  },
  "tempelhof-schoeneberg": {
    schoeneberg: "Schöneberg",
    friedenau: "Friedenau",
    tempelhof: "Tempelhof",
    mariendorf: "Mariendorf",
    marienfelde: "Marienfelde",
    lichtenrade: "Lichtenrade",
  },
  neukoelln: {
    neukoelln: "Neukölln",
    britz: "Britz",
    buckow: "Buckow",
    rudow: "Rudow",
    gropiusstadt: "Gropiusstadt",
  },
  "treptow-koepenick": {
    "alt-treptow": "Alt-Treptow",
    plaenterwald: "Plänterwald",
    baumschulenweg: "Baumschulenweg",
    johannisthal: "Johannisthal",
    niederschoeneweide: "Niederschöneweide",
    altglienicke: "Altglienicke",
    adlershof: "Adlershof",
    bohnsdorf: "Bohnsdorf",
    oberschoeneweide: "Oberschöneweide",
    koepenick: "Köpenick",
    friedrichshagen: "Friedrichshagen",
    rahnsdorf: "Rahnsdorf",
    gruenau: "Grünau",
    mueggelheim: "Müggelheim",
    schmoeckwitz: "Schmöckwitz",
  },
  "marzahn-hellersdorf": {
    marzahn: "Marzahn",
    biesdorf: "Biesdorf",
    kaulsdorf: "Kaulsdorf",
    mahlsdorf: "Mahlsdorf",
    hellersdorf: "Hellersdorf",
  },
  lichtenberg: {
    friedrichsfelde: "Friedrichsfelde",
    karlshorst: "Karlshorst",
    lichtenberg: "Lichtenberg",
    falkenberg: "Falkenberg",
    malchow: "Malchow",
    wartenberg: "Wartenberg",
    "neu-hohenschoenhausen": "Neu-Hohenschönhausen",
    "alt-hohenschoenhausen": "Alt-Hohenschönhausen",
    fennpfuhl: "Fennpfuhl",
    rummelsburg: "Rummelsburg",
  },
  reinickendorf: {
    reinickendorf: "Reinickendorf",
    tegel: "Tegel",
    konradshoehe: "Konradshöhe",
    heiligensee: "Heiligensee",
    frohnau: "Frohnau",
    hermsdorf: "Hermsdorf",
    waidmannslust: "Waidmannslust",
    luebars: "Lübars",
    wittenau: "Wittenau",
    "maerkisches-viertel": "Märkisches Viertel",
    borsigwalde: "Borsigwalde",
  },
} as const;

export type BerlinArea = keyof typeof AREA_LOCALITIES;
export type Locality = { [B in BerlinArea]: keyof (typeof AREA_LOCALITIES)[B] }[BerlinArea];

export const LOCALITIES = Object.values(AREA_LOCALITIES).flatMap((o) => Object.keys(o)) as [
  Locality,
  ...Locality[],
];
export const LOCALITY_NAMES = Object.assign({}, ...Object.values(AREA_LOCALITIES)) as Record<
  Locality,
  string
>;
/** The area (borough) a locality belongs to. */
export const LOCALITY_AREA = Object.fromEntries(
  Object.entries(AREA_LOCALITIES).flatMap(([b, o]) => Object.keys(o).map((k) => [k, b])),
) as Record<Locality, BerlinArea>;

/** Smallest group whose share is shown. */
export const MIN_GROUP = 10;

export type Reaction = (typeof REACTIONS)[number];
export type Usage = (typeof USAGES)[number];
export type Area = (typeof AREAS)[number];
export type Origin = (typeof ORIGINS)[number];
export type Half = (typeof HALVES)[number];
export type Age = (typeof AGES)[number];

export type FeedbackTotals = {
  like: number;
  dislike: number;
  say: number;
  know: number;
  never: number;
};
export type FeedbackCompare = {
  east: number | null;
  west: number | null;
  moved: number | null;
  area: number | null;
  locality: number | null;
};

type Counter = Pick<BasePayload, "count">;

const count = async (payload: Counter, where: Where) =>
  (await payload.count({ collection: "word-feedback", where })).totalDocs;

export async function feedbackTotals(payload: Counter, wordId: number): Promise<FeedbackTotals> {
  const keys = [...REACTIONS, ...USAGES] as const;
  const counts = await Promise.all(
    keys.map((k) =>
      count(payload, {
        word: { equals: wordId },
        [REACTIONS.includes(k as Reaction) ? "reaction" : "usage"]: { equals: k },
      }),
    ),
  );
  return Object.fromEntries(keys.map((k, i) => [k, counts[i]])) as FeedbackTotals;
}

/** Percent of `say` among rows with a usage; null below MIN_GROUP. */
async function share(payload: Counter, wordId: number, group: Where): Promise<number | null> {
  const base: Where = { and: [{ word: { equals: wordId } }, { usage: { exists: true } }, group] };
  const total = await count(payload, base);
  if (total < MIN_GROUP) return null;
  const say = await count(payload, { and: [base, { usage: { equals: "say" } }] });
  return Math.round((say / total) * 100);
}

export async function feedbackCompare(
  payload: Counter,
  wordId: number,
  area: Area | null,
  locality: Locality | null = null,
): Promise<FeedbackCompare> {
  const [east, west, moved, areaShare, localityShare] = await Promise.all([
    share(payload, wordId, { half: { equals: "east" } }),
    share(payload, wordId, { half: { equals: "west" } }),
    share(payload, wordId, { origin: { in: ["movedOver10", "movedUnder10"] } }),
    area ? share(payload, wordId, { area: { equals: area } }) : null,
    locality ? share(payload, wordId, { locality: { equals: locality } }) : null,
  ]);
  return { east, west, moved, area: areaShare, locality: localityShare };
}
