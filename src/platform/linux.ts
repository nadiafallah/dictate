import { msg } from "../messages.js";
import { run } from "./run.js";
import type { AudioDevice, Platform } from "./types.js";

/** Parse `pactl list short sources`, dropping monitors (they record speaker output, not a mic). */
export function parsePactlSources(stdout: string): AudioDevice[] {
  const devices: AudioDevice[] = [];
  for (const line of stdout.split("\n")) {
    const [index, name] = line.split("\t");
    if (!name || !/^\d+$/.test(index) || name.endsWith(".monitor")) continue;
    devices.push({ id: index, name });
  }
  return devices;
}

/** Clipboard tools to try, in order. Wayland first when a Wayland session is running. */
export function clipboardCommands(env: NodeJS.ProcessEnv = process.env): Array<[string, string[]]> {
  const x11: Array<[string, string[]]> = [
    ["xclip", ["-selection", "clipboard"]],
    ["xsel", ["--clipboard", "--input"]],
  ];
  return env.WAYLAND_DISPLAY ? [["wl-copy", []], ...x11] : x11;
}

export const linux: Platform = {
  // -f pulse works on PulseAudio and on PipeWire (via pipewire-pulse).
  // It takes a source name; a bare number from --list is that source's pactl index.
  async inputArgs(mic) {
    let name = mic ?? "default";
    if (mic && /^\d+$/.test(mic)) {
      const found = (await this.listDevices()).find((d) => d.id === mic);
      if (found) name = found.name;
    }
    return ["-f", "pulse", "-i", name];
  },

  async listDevices() {
    const r = await run("pactl", ["list", "short", "sources"]).catch(() => undefined);
    return r?.code === 0 ? parsePactlSources(r.stdout) : [];
  },

  async copy(text) {
    // Same lesson as pbcopy on macOS: never let the tool guess the encoding.
    const env = { ...process.env, LANG: "C.UTF-8", LC_ALL: "C.UTF-8" };
    const errors: string[] = [];
    for (const [cmd, args] of clipboardCommands()) {
      try {
        const r = await run(cmd, args, { input: text, env, daemonizes: true });
        if (r.code === 0) return;
        errors.push(`${cmd}: exit ${r.code}`);
      } catch {
        // not installed — try the next one
      }
    }
    throw new Error(errors.join("; ") || msg.noClipboardTool);
  },
};
