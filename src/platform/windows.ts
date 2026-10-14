// UNTESTED: written to the same contract as macos.ts but never run on a real
// Windows machine. If you have one, please try it and open an issue.
import { run } from "./run.js";
import type { AudioDevice, Platform } from "./types.js";

/** Parse audio devices from `ffmpeg -list_devices true -f dshow -i dummy`. */
export function parseDshowDevices(stderr: string): AudioDevice[] {
  const devices: AudioDevice[] = [];
  let inAudio = false;
  for (const line of stderr.split("\n")) {
    // Newer ffmpeg tags each line "(audio)"; older builds use section headers.
    if (/DirectShow audio devices/i.test(line)) inAudio = true;
    else if (/DirectShow video devices/i.test(line)) inAudio = false;
    if (/Alternative name/i.test(line)) continue;
    const m = line.match(/\]\s*"(.+)"\s*(\((audio|video)\))?/);
    if (!m) continue;
    const isAudio = m[3] ? m[3] === "audio" : inAudio;
    if (isAudio) devices.push({ id: String(devices.length), name: m[1] });
  }
  return devices;
}

let cache: AudioDevice[] | undefined;

export const windows: Platform = {
  async inputArgs(mic) {
    // dshow addresses devices by name. Accept an index (as --list prints) or a name.
    let name = mic;
    if (!mic || /^\d+$/.test(mic)) {
      const devices = cache ?? (await this.listDevices());
      name = devices[mic ? Number(mic) : 0]?.name;
    }
    if (!name) throw new Error("no audio input device");
    return ["-f", "dshow", "-i", `audio=${name}`];
  },

  async listDevices() {
    const r = await run("ffmpeg", ["-hide_banner", "-list_devices", "true", "-f", "dshow", "-i", "dummy"]);
    cache = parseDshowDevices(r.stderr);
    return cache;
  },

  async copy(text) {
    // clip.exe mangles non-ASCII; PowerShell's Set-Clipboard reading UTF-8 stdin does not.
    const r = await run(
      "powershell",
      ["-NoProfile", "-Command", "[Console]::InputEncoding=[Text.Encoding]::UTF8; Set-Clipboard -Value ([Console]::In.ReadToEnd())"],
      { input: text },
    );
    if (r.code !== 0) throw new Error(r.stderr.trim() || `Set-Clipboard exited ${r.code}`);
  },
};
