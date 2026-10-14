import { existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { loadConfig } from "./config.js";
import { msg } from "./messages.js";
import { getPlatform } from "./platform/index.js";
import { record, type StopMode } from "./record.js";
import { isSilent, measure } from "./silence.js";
import { transcribe, type Attempt } from "./transcribe.js";

export type Command =
  | { cmd: "record"; stop: StopMode; mic?: string }
  | { cmd: "again"; hint?: string }
  | { cmd: "list" }
  | { cmd: "help" };

export function parseArgs(argv: string[]): Command {
  let stop: StopMode = "enter";
  let mic: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") return { cmd: "help" };
    if (a === "--list") return { cmd: "list" };
    if (a === "--again") {
      const hint = argv.slice(i + 1).join(" ").trim();
      return { cmd: "again", hint: hint || undefined };
    }
    if (a === "--auto") stop = "auto";
    else if (a === "--hold") stop = "hold";
    else if (/^\d+$/.test(a)) mic = a;
    else throw new Error(msg.badArgs(a));
  }
  return { cmd: "record", stop, mic };
}

const say = (s: string) => process.stderr.write(s + "\n");

async function main(): Promise<number> {
  // Load .env from the repo, not the cwd: Hammerspoon launches us from $HOME.
  dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });
  const cfg = loadConfig();

  let command: Command;
  try {
    command = parseArgs(process.argv.slice(2));
  } catch (e) {
    say((e as Error).message + "\n\n" + msg.usage);
    return 2;
  }
  if (command.cmd === "help") {
    say(msg.usage);
    return 0;
  }

  const platform = getPlatform();

  if (command.cmd === "list") {
    const devices = await platform.listDevices();
    if (!devices.length) {
      say(msg.noDevices);
      return 1;
    }
    say(msg.devicesTitle);
    for (const d of devices) say(`  [${d.id}] ${d.name}`);
    return 0;
  }

  if (!cfg.apiKey) {
    say(msg.noApiKey);
    return 1;
  }

  let attempt: Attempt = { kind: "first" };
  if (command.cmd === "again") {
    if (!existsSync(cfg.lastClip)) {
      say(msg.noLastClip);
      return 1;
    }
    attempt = { kind: "again", hint: command.hint };
    say(command.hint ? msg.retryingWithHint(command.hint) : msg.retrying);
  } else {
    const hold = command.stop === "hold";
    say(hold ? msg.recordingHold : command.stop === "auto" ? msg.recordingAuto : msg.recording);
    try {
      const r = await record({
        input: await platform.inputArgs(command.mic ?? cfg.mic),
        out: cfg.lastClip,
        maxSeconds: cfg.maxSeconds,
        mode: command.stop,
        stopFile: cfg.stopFile,
        // The floating card reads these from stdout to draw its level meter.
        onLevel: hold ? (db) => process.stdout.write(`LEVEL:${Math.max(db, -100).toFixed(1)}\n`) : undefined,
      });
      if (r.hitMax) say(msg.maxReached(cfg.maxSeconds));
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      say(err.code === "ENOENT" ? msg.noFfmpeg : msg.recordFailed(err.message) + "\n" + msg.micHint);
      return 1;
    }
  }

  try {
    if (isSilent(await measure(cfg.lastClip))) {
      say(msg.silent);
      return 3;
    }
    if (attempt.kind === "first") say(msg.transcribing);
    let text: string;
    try {
      text = await transcribe(cfg.apiKey, cfg.model, cfg.lastClip, attempt);
    } catch (e) {
      say(msg.apiFailed((e as Error).message));
      return 1;
    }
    if (!text) {
      say(msg.emptyResult);
      return 1;
    }

    process.stdout.write(text + "\n");
    try {
      await platform.copy(text);
      say(msg.copied);
    } catch (e) {
      say(msg.copyFailed((e as Error).message));
      return 1;
    }
    return 0;
  } finally {
    if (!cfg.keepLast) rmSync(cfg.lastClip, { force: true });
  }
}

const isEntry = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isEntry) {
  main().then(
    (code) => process.exit(code),
    (e) => {
      say(e instanceof Error ? e.message : String(e));
      process.exit(1);
    },
  );
}
