import { run } from "./run.js";
import type { AudioDevice, Platform } from "./types.js";

/** Parse the audio half of `ffmpeg -f avfoundation -list_devices true -i ""`. */
export function parseAvfoundationDevices(stderr: string): AudioDevice[] {
  const devices: AudioDevice[] = [];
  let inAudio = false;
  for (const line of stderr.split("\n")) {
    if (/AVFoundation audio devices/i.test(line)) {
      inAudio = true;
      continue;
    }
    if (/AVFoundation video devices/i.test(line)) {
      inAudio = false;
      continue;
    }
    const m = inAudio && line.match(/\]\s*\[(\d+)\]\s*(.+?)\s*$/);
    if (m) devices.push({ id: m[1], name: m[2] });
  }
  return devices;
}

export const macos: Platform = {
  // ":<n>" means "no video, audio device n". ":default" follows System Settings.
  inputArgs: async (mic) => ["-f", "avfoundation", "-i", `:${mic ?? "default"}`],

  async listDevices() {
    const r = await run("ffmpeg", ["-hide_banner", "-f", "avfoundation", "-list_devices", "true", "-i", ""]);
    return parseAvfoundationDevices(r.stderr);
  },

  async copy(text) {
    // pbcopy picks its encoding from LANG/LC_CTYPE. Launched from Hammerspoon or
    // another GUI the environment is nearly empty, pbcopy falls back to Mac OS
    // Roman, and "سلام" lands on the clipboard as "ÿ≥ŸÑÿßŸÖ". Always say UTF-8.
    const r = await run("pbcopy", [], {
      input: text,
      env: { ...process.env, LANG: "en_US.UTF-8", LC_CTYPE: "UTF-8", LC_ALL: "en_US.UTF-8" },
    });
    if (r.code !== 0) throw new Error(r.stderr.trim() || `pbcopy exited ${r.code}`);
  },
};
