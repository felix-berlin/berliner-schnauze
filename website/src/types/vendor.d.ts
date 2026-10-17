declare module "hyphenation.de";
declare module "hypher";
declare module "de-compromise";
// Deep import used by payload-app/word-derived (payload/ is excluded from this tsconfig).
declare module "natural/lib/natural/phonetics/soundex.js" {
  export default class SoundEx {
    process(token: string, codeLength?: number): string;
  }
}
declare module "natural/lib/natural/distance/jaro-winkler_distance.js" {
  export default function JaroWinklerDistance(s1: string, s2: string): number;
}
