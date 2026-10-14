import { describe, expect, it } from "vitest";
import { getPlatform } from "../src/platform/index.js";
import { clipboardCommands, linux, parsePactlSources } from "../src/platform/linux.js";

describe("parsePactlSources", () => {
  it("keeps microphones in order and drops monitors", () => {
    const out = [
      "0\talsa_output.pci-0000_00_1f.3.analog-stereo.monitor\tmodule-alsa-card.c\ts16le 2ch 44100Hz\tSUSPENDED",
      "1\talsa_input.pci-0000_00_1f.3.analog-stereo\tmodule-alsa-card.c\ts16le 2ch 44100Hz\tRUNNING",
      "5\tbluez_input.AA_BB_CC.0\tmodule-bluez5-device.c\tfloat32le 1ch 16000Hz\tIDLE",
      "",
    ].join("\n");
    expect(parsePactlSources(out)).toEqual([
      { id: "1", name: "alsa_input.pci-0000_00_1f.3.analog-stereo" },
      { id: "5", name: "bluez_input.AA_BB_CC.0" },
    ]);
  });
});

describe("linux platform", () => {
  it("is what getPlatform returns on linux", () => {
    expect(getPlatform("linux")).toBe(linux);
  });
  it("records from the pulse default source unless told otherwise", async () => {
    expect(await linux.inputArgs(undefined)).toEqual(["-f", "pulse", "-i", "default"]);
    expect(await linux.inputArgs("alsa_input.usb")).toEqual(["-f", "pulse", "-i", "alsa_input.usb"]);
  });
  it("prefers wl-copy under Wayland and falls back to X11 tools", () => {
    expect(clipboardCommands({ WAYLAND_DISPLAY: "wayland-0" }).map((c) => c[0])).toEqual(["wl-copy", "xclip", "xsel"]);
    expect(clipboardCommands({}).map((c) => c[0])).toEqual(["xclip", "xsel"]);
  });
});
