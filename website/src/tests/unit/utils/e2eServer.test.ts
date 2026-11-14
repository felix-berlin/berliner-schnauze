import { describe, expect, it, vi } from "vitest";

vi.mock("astro:env/server", () => ({ E2E_SERVER: undefined, PAYLOAD_SERVER_URL: undefined }));

const { isE2eServer } = await import("@utils/e2eServer.ts");

describe("isE2eServer", () => {
  it("needs the flag and a localhost Payload URL", () => {
    expect(isE2eServer("1", "http://localhost:4321")).toBe(true);
    expect(isE2eServer("1", "http://127.0.0.1:5452/")).toBe(true);
    expect(isE2eServer(undefined, "http://localhost:4321")).toBe(false);
    expect(isE2eServer("true", "http://localhost:4321")).toBe(false);
  });

  it("ignores the flag on a public server URL", () => {
    expect(isE2eServer("1", "https://cms.berliner-schnauze.wtf")).toBe(false);
    expect(isE2eServer("1", "http://localhost.evil.example")).toBe(false);
    expect(isE2eServer("1", undefined)).toBe(false);
    expect(isE2eServer()).toBe(false);
  });
});
