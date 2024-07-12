import { describe, it, expect } from "vitest";
import "@vitest/web-worker";
import filterWorker from "../../../services/filterWorker.ts?worker";

let worker = new filterWorker();
worker = new Worker(new URL("../../../services/filterWorker.ts?worker", import.meta.url));

describe("filterWorker", () => {
  it("should filter words by activeLetterFilter", () => {
    worker.postMessage({
      letterGroups: [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
        "K",
        "L",
        "M",
        "N",
        "O",
        "P",
        "Q",
        "R",
        "S",
        "T",
        "U",
        "V",
        "W",
        "Z",
        "Ä",
        "Ö",
        "ü",
      ],
      wordList: [
        {
          id: "cG9zdDo0MjUz",
          slug: "aas",
          wordGroup: "A",
          dateGmt: "2022-01-22T17:28:48",
          modifiedGmt: "2024-01-25T17:31:51",
          berlinerWordId: 4253,
          wordProperties: {
            article: null,
            berlinerisch: "Aas",
            berlinerischAudio: null,
            learnMore: null,
            berolinismus: false,
            examples: [
              { example: "Dir Aas kenn ick!", exampleExplanation: null, exampleAudio: null },
              { example: "Keen Aas hier!", exampleExplanation: "keiner da", exampleAudio: null },
            ],
            translations: [
              { translation: "unbeliebter" },
              { translation: "hinterhältiger Mensch" },
            ],
            alternativeWords: null,
            relatedWords: {
              nodes: [
                { id: "cG9zdDo0MjUz", wordProperties: { berlinerisch: "Aas" }, slug: "aas" },
                {
                  id: "cG9zdDo0MjU0",
                  wordProperties: { berlinerisch: "Abeetadenkmal" },
                  slug: "abeetadenkmal",
                },
                {
                  id: "cG9zdDo0Njkx",
                  wordProperties: { berlinerisch: "abfahren " },
                  slug: "abfahren",
                },
              ],
            },
            wikimediaFiles: null,
            images: null,
          },
          berlinerischWordTypes: { nodes: [{ name: "Substantiv" }] },
        },
        {
          id: "cG9zdDo0MjU0",
          slug: "abeetadenkmal",
          wordGroup: "A",
          dateGmt: "2022-01-22T17:39:21",
          modifiedGmt: "2022-06-03T11:20:04",
          berlinerWordId: 4254,
          wordProperties: {
            article: null,
            berlinerisch: "Abeetadenkmal",
            berlinerischAudio: null,
            learnMore: null,
            berolinismus: false,
            examples: [
              {
                example: "Der steht da mit seine Schaufel wie ‘n Abeetadenkmal.",
                exampleExplanation: null,
                exampleAudio: null,
              },
            ],
            translations: [{ translation: "Arbeiterdenkmal" }, { translation: "fauler Arbeiter" }],
            alternativeWords: null,
            relatedWords: null,
            wikimediaFiles: null,
            images: null,
          },
          berlinerischWordTypes: { nodes: [{ name: "Substantiv" }] },
        },
      ],
      activeLetterFilter: "A",
    });

    worker.onmessage = (e) => {
      expect(e.data).toEqual([{ wordGroup: "a" }]);
    };
  });
});
