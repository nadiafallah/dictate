import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import * as readline from "node:readline";

export type StopMode = "enter" | "auto" | "hold";

export interface RecordOptions {
  input: string[]; // platform-specific ffmpeg input args
  out: string;
  maxSeconds: number;
  mode: StopMode;
  stopFile: string;
  /** Called with the live RMS level in dBFS, throttled. Used by the floating card. */
  onLevel?: (db: number) => void;
}

export interface RecordResult {
  hitMax: boolean;
  seconds: number;
}

/** Pause length that ends an --auto recording. Shorter cuts people off mid-thought. */
export const AUTO_SILENCE_SECONDS = 3;
const AUTO_NOISE_DB = -35;

export function ffmpegArgs(o: Pick<RecordOptions, "input" | "out" | "maxSeconds" | "mode"> & { levels: boolean }): string[] {
  const filters: string[] = [];
  if (o.mode === "auto") filters.push(`silencedetect=noise=${AUTO_NOISE_DB}dB:d=${AUTO_SILENCE_SECONDS}`);
  if (o.levels) filters.push("astats=metadata=1:reset=1", "ametadata=mode=print:key=lavfi.astats.Overall.RMS_level");
  return [
    "-hide_banner", "-nostats", "-loglevel", "info", "-y",
    ...o.input,
    "-t", String(o.maxSeconds),
    ...(filters.length ? ["-af", filters.join(",")] : []),
    // Opus, not WAV. WAV is ~32 kB/s, so two minutes of talking blew past the
    // model's inline-audio ceiling and the clip was rejected unheard. Mono
    // Opus at 32 kbps is ~4 kB/s and still clean for speech.
    "-ac", "1", "-ar", "48000", "-c:a", "libopus", "-b:a", "32k", "-application", "voip",
    "-f", "ogg", o.out,
  ];
}

/**
 * Tracks silencedetect output for --auto. Stop on a pause only after speech has
 * been heard, so starting the recording and then thinking for a second doesn't end it.
 */
export function autoStopper() {
  let heardSpeech = false;
  return (line: string): boolean => {
    if (/silence_end:/.test(line)) heardSpeech = true;
    const start = line.match(/silence_start:\s*(-?[\d.]+)/);
    if (!start) return false;
    // A silence that starts well after t=0 means there was sound before it.
    if (Number(start[1]) > 0.5) heardSpeech = true;
    return heardSpeech;
  };
}

export function record(o: RecordOptions): Promise<RecordResult> {
  const started = Date.now();
  if (o.mode === "hold") rmSync(o.stopFile, { force: true });

  const ff = spawn("ffmpeg", ffmpegArgs({ ...o, levels: !!o.onLevel }), { stdio: ["pipe", "ignore", "pipe"] });

  return new Promise((resolve, reject) => {
    let stopped = false;
    let stderrTail = "";
    let lastLevelAt = 0;
    const shouldAutoStop = autoStopper();
    const cleanups: Array<() => void> = [];

    // "q" lets ffmpeg flush and close the Ogg container; a kill would truncate it.
    const stop = () => {
      if (stopped) return;
      stopped = true;
      ff.stdin.end("q");
    };

    readline.createInterface({ input: ff.stderr }).on("line", (line) => {
      stderrTail = (stderrTail + line + "\n").slice(-4000);
      if (o.mode === "auto" && shouldAutoStop(line)) stop();
      const lvl = o.onLevel && line.match(/RMS_level=(-?[\d.]+|-inf)/);
      if (lvl && Date.now() - lastLevelAt > 80) {
        lastLevelAt = Date.now();
        o.onLevel!(lvl[1] === "-inf" ? -Infinity : Number(lvl[1]));
      }
    });

    if (o.mode === "enter") {
      const rl = readline.createInterface({ input: process.stdin });
      rl.once("line", stop);
      cleanups.push(() => rl.close());
    }
    if (o.mode === "hold") {
      const t = setInterval(() => existsSync(o.stopFile) && stop(), 100);
      cleanups.push(() => {
        clearInterval(t);
        rmSync(o.stopFile, { force: true });
      });
    }
    const onSignal = () => stop();
    process.on("SIGINT", onSignal);
    process.on("SIGTERM", onSignal);
    cleanups.push(() => {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
    });

    ff.on("error", (e) => {
      cleanups.forEach((c) => c());
      reject(e);
    });
    ff.on("close", (code) => {
      cleanups.forEach((c) => c());
      const seconds = (Date.now() - started) / 1000;
      if (code === 0 || stopped) resolve({ hitMax: !stopped, seconds });
      else reject(new Error(stderrTail.trim()));
    });
  });
}
