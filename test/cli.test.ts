import { describe, expect, it } from "vitest";
import { parseArgs } from "../src/cli.js";
import { loadConfig } from "../src/config.js";

describe("parseArgs", () => {
  it("defaults to Enter-to-stop recording", () => {
    expect(parseArgs([])).toEqual({ cmd: "record", stop: "enter", mic: undefined });
  });
  it("handles --auto, --hold and a device number", () => {
    expect(parseArgs(["--auto", "2"])).toEqual({ cmd: "record", stop: "auto", mic: "2" });
    expect(parseArgs(["--hold"])).toMatchObject({ stop: "hold" });
  });
  it("handles --list and --again with and without a hint", () => {
    expect(parseArgs(["--list"])).toEqual({ cmd: "list" });
    expect(parseArgs(["--again"])).toEqual({ cmd: "again", hint: undefined });
    expect(parseArgs(["--again", "سیاوش، صدف"])).toEqual({ cmd: "again", hint: "سیاوش، صدف" });
  });
  it("rejects unknown flags", () => {
    expect(() => parseArgs(["--nope"])).toThrow();
  });
});

describe("loadConfig", () => {
  it("matches the README defaults", () => {
    expect(loadConfig({})).toMatchObject({
      maxSeconds: 600,
      keepLast: true,
      stopFile: "/tmp/dictate-hold.stop",
      lastClip: "/tmp/dictate-last.ogg",
    });
    expect(loadConfig({ DICTATE_KEEP_LAST: "0" }).keepLast).toBe(false);
  });
});
