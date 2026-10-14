import { describe, expect, it } from "vitest";
import { isSilent, parseVolumedetect } from "../src/silence.js";

const out = (mean: string, max: string) =>
  `[Parsed_volumedetect_0 @ 0x1] n_samples: 48000\n[Parsed_volumedetect_0 @ 0x1] mean_volume: ${mean} dB\n[Parsed_volumedetect_0 @ 0x1] max_volume: ${max} dB\n`;

describe("silence gate", () => {
  it("parses volumedetect", () => {
    expect(parseVolumedetect(out("-27.3", "-6.1"))).toEqual({ meanDb: -27.3, maxDb: -6.1 });
  });
  it("handles digital silence", () => {
    expect(parseVolumedetect(out("-inf", "-inf"))).toEqual({ meanDb: -Infinity, maxDb: -Infinity });
    expect(isSilent(parseVolumedetect(out("-inf", "-inf")))).toBe(true);
  });
  it("treats room noise as silence and speech as not", () => {
    expect(isSilent({ meanDb: -70, maxDb: -55 })).toBe(true);
    expect(isSilent({ meanDb: -35, maxDb: -8 })).toBe(false);
  });
  it("treats unparseable output as silence", () => {
    expect(isSilent(parseVolumedetect("No such file"))).toBe(true);
  });
});
