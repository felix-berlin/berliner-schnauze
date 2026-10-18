import { describe, expect, it } from "vitest";

import { previewToken, readPreviewToken } from "../src/lib/preview";

const now = Date.UTC(2026, 9, 17, 12);
const token = previewToken("geheim", { collection: "words", id: 42 }, now);

describe("preview tokens", () => {
  it("unlock the signed doc until they expire", () => {
    expect(readPreviewToken("geheim", token, now)).toMatchObject({ collection: "words", id: 42 });
    expect(readPreviewToken("geheim", token, now + 3601_000)).toBeNull();
  });

  it("reject another secret, a changed doc and garbage", () => {
    expect(readPreviewToken("anders", token, now)).toBeNull();
    expect(readPreviewToken("geheim", token.replace("words.42", "words.43"), now)).toBeNull();
    expect(readPreviewToken("geheim", token.replace("words", "pages"), now)).toBeNull();
    expect(readPreviewToken("geheim", "x.y", now)).toBeNull();
    expect(readPreviewToken("geheim", undefined, now)).toBeNull();
    expect(readPreviewToken("", token, now)).toBeNull();
  });
});
