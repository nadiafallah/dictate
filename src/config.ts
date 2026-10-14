// Every knob comes from the environment; defaults match the README's table.

export interface Config {
  apiKey: string | undefined;
  model: string;
  mic: string | undefined;
  maxSeconds: number;
  keepLast: boolean;
  stopFile: string;
  lastClip: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const max = Number(env.DICTATE_MAX_SECONDS);
  return {
    apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || undefined,
    model: env.DICTATE_MODEL?.trim() || "gemini-3-flash-preview",
    mic: env.DICTATE_MIC?.trim() || undefined,
    maxSeconds: Number.isFinite(max) && max > 0 ? max : 600,
    keepLast: env.DICTATE_KEEP_LAST !== "0",
    stopFile: env.DICTATE_STOP_FILE || "/tmp/dictate-hold.stop",
    lastClip: env.DICTATE_LAST_CLIP || "/tmp/dictate-last.ogg",
  };
}
