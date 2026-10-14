import { describe, expect, it } from "vitest";
import { buildRequest, extractText } from "../src/transcribe.js";

describe("buildRequest", () => {
  it("first pass is deterministic with minimal thinking", () => {
    const r = buildRequest("m", { kind: "first" });
    expect(r.config.temperature).toBe(0);
    expect(r.config.thinkingConfig).toMatchObject({ thinkingLevel: "MINIMAL", includeThoughts: false });
  });
  it("unguided retry samples", () => {
    expect(buildRequest("m", { kind: "again" }).config.temperature).toBe(1);
    expect(buildRequest("m", { kind: "again", hint: "  " }).config.temperature).toBe(1);
  });
  it("hinted retry stays deterministic and carries the spellings", () => {
    const r = buildRequest("m", { kind: "again", hint: "سیاوش، صدف" });
    expect(r.config.temperature).toBe(0);
    expect(r.prompt).toContain("سیاوش، صدف");
  });
});

describe("extractText", () => {
  it("drops thought parts that Gemini 3 returns as text", () => {
    const res = {
      candidates: [
        {
          content: {
            parts: [
              { text: "**Transcribing the audio** I will now…", thought: true },
              { text: "سلام، " },
              { text: "خوبی؟" },
            ],
          },
        },
      ],
    };
    expect(extractText(res)).toBe("سلام، خوبی؟");
  });
  it("returns empty string for no candidates", () => {
    expect(extractText({ candidates: [] })).toBe("");
  });
});
