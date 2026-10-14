import { msg } from "../messages.js";
import { linux } from "./linux.js";
import { macos } from "./macos.js";
import type { Platform } from "./types.js";
import { windows } from "./windows.js";

export type { AudioDevice, Platform } from "./types.js";

export function getPlatform(p: NodeJS.Platform = process.platform): Platform {
  if (p === "darwin") return macos;
  if (p === "win32") return windows;
  if (p === "linux") return linux;
  throw new Error(msg.unsupportedPlatform(p));
}
