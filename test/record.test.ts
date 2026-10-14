import { describe, expect, it } from "vitest";
import { parseAvfoundationDevices } from "../src/platform/macos.js";
import { autoStopper, ffmpegArgs } from "../src/record.js";

describe("ffmpegArgs", () => {
  it("encodes mono Opus at 32 kbps with a hard cap", () => {
    const a = ffmpegArgs({ input: ["-f", "avfoundation", "-i", ":default"], out: "x.ogg", maxSeconds: 600, mode: "enter", levels: false });
    expect(a.join(" ")).toContain("-t 600");
    expect(a.join(" ")).toContain("-ac 1 -ar 48000 -c:a libopus -b:a 32k");
    expect(a).not.toContain("-af");
  });
  it("adds silencedetect only in --auto", () => {
    const a = ffmpegArgs({ input: [], out: "x.ogg", maxSeconds: 5, mode: "auto", levels: false });
    expect(a[a.indexOf("-af") + 1]).toMatch(/^silencedetect=/);
  });
});

describe("autoStopper", () => {
  it("ignores the leading silence before you start talking", () => {
    const s = autoStopper();
    expect(s("[silencedetect @ 0x1] silence_start: 0")).toBe(false);
    expect(s("[silencedetect @ 0x1] silence_end: 1.8 | silence_duration: 1.8")).toBe(false);
    expect(s("[silencedetect @ 0x1] silence_start: 9.2")).toBe(true);
  });
  it("stops on the first pause if you started talking immediately", () => {
    expect(autoStopper()("[silencedetect @ 0x1] silence_start: 4.1")).toBe(true);
  });
});

describe("parseAvfoundationDevices", () => {
  it("returns only audio devices", () => {
    const stderr = `[AVFoundation indev @ 0x1] AVFoundation video devices:
[AVFoundation indev @ 0x1] [0] FaceTime HD Camera
[AVFoundation indev @ 0x1] [1] Capture screen 0
[AVFoundation indev @ 0x1] AVFoundation audio devices:
[AVFoundation indev @ 0x1] [0] MacBook Pro Microphone
[AVFoundation indev @ 0x1] [1] AirPods Pro
: Input/output error`;
    expect(parseAvfoundationDevices(stderr)).toEqual([
      { id: "0", name: "MacBook Pro Microphone" },
      { id: "1", name: "AirPods Pro" },
    ]);
  });
});
