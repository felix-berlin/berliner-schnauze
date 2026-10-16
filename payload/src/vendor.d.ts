declare module "hyphenation.de";
declare module "hypher";
declare module "de-compromise";
declare module "natural/lib/natural/phonetics/soundex.js" {
  export default class SoundEx {
    process(token: string, codeLength?: number): string;
  }
}
