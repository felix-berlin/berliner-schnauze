/** 1x1 PNG. */
export const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

/** Empty ID3v2 tag + one silent MPEG-1 Layer III frame. */
export const MP3_BYTES = Buffer.concat([
  Buffer.from([0x49, 0x44, 0x33, 0x03, 0, 0, 0, 0, 0, 0]),
  Buffer.from([0xff, 0xfb, 0x90, 0x64]),
  Buffer.alloc(413),
]);

/** Minimal PDF header, enough for mime sniffing. */
export const PDF_BYTES = Buffer.from("%PDF-1.4\n%%EOF\n");
