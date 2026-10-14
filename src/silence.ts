import { run } from "./platform/run.js";

// Given silence, the model does not answer "silence": it writes a fluent,
// plausible, entirely invented note. Telling it "return nothing if the clip is
// silent" in the prompt does not fix that either — it makes the model refuse
// perfectly good long clips. So the gate is deterministic and runs before any
// network call: ffmpeg's volumedetect, and a peak-level threshold.

/** Peak level (dBFS) below which a clip counts as silence. Room noise on a laptop mic peaks around -55; speech is well above -30. */
export const SILENCE_MAX_DB = -40;

export interface Volume {
  meanDb: number;
  maxDb: number;
}

/** Parse ffmpeg volumedetect output. Returns undefined if no audio was analysed. */
export function parseVolumedetect(stderr: string): Volume | undefined {
  const mean = stderr.match(/mean_volume:\s*(-?[\d.]+|-inf)\s*dB/);
  const max = stderr.match(/max_volume:\s*(-?[\d.]+|-inf)\s*dB/);
  if (!mean || !max) return undefined;
  const num = (s: string) => (s === "-inf" ? -Infinity : Number(s));
  return { meanDb: num(mean[1]), maxDb: num(max[1]) };
}

export function isSilent(v: Volume | undefined, thresholdDb = SILENCE_MAX_DB): boolean {
  return !v || v.maxDb < thresholdDb;
}

export async function measure(file: string): Promise<Volume | undefined> {
  const r = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "volumedetect", "-f", "null", "-"]);
  return parseVolumedetect(r.stderr);
}
