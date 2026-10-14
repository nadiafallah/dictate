import { readFile } from "node:fs/promises";
import { GoogleGenAI, ThinkingLevel, type GenerateContentConfig, type GenerateContentResponse } from "@google/genai";

const PROMPT = `Transcribe this audio exactly as spoken.

- Write it in the language it was spoken in. Do not translate.
- If it is Persian, keep it conversational (محاوره‌ای) as spoken — "می‌خوام" stays "می‌خوام", not "می‌خواهم". Do not rewrite it into formal written Persian.
- English words, names and technical terms spoken inside Persian: write them as they were said, in Latin script.
- Add natural punctuation and paragraph breaks. Drop filler sounds (um, اِ، اوم) but do not otherwise edit, summarise or correct.
- Output only the transcript. No preamble, no notes, no quotation marks.`;

export type Attempt = { kind: "first" } | { kind: "again"; hint?: string };

export interface TranscribeRequest {
  model: string;
  prompt: string;
  config: GenerateContentConfig;
}

/**
 * The first pass is deterministic (temperature 0), so an unguided retry would
 * return the identical text. A retry without a hint therefore samples; a retry
 * with a hint stays deterministic and just applies the spellings.
 */
export function buildRequest(model: string, attempt: Attempt): TranscribeRequest {
  const hint = attempt.kind === "again" ? attempt.hint?.trim() : undefined;
  const temperature = attempt.kind === "again" && !hint ? 1 : 0;
  const prompt = hint
    ? `${PROMPT}\n\nThese names/terms appear in the audio; use exactly these spellings: ${hint}`
    : PROMPT;
  return {
    model,
    prompt,
    config: {
      temperature,
      // On Gemini 3 the thought summary comes back as an ordinary text part, so
      // the SDK's `.text` glues the model's monologue onto the front of the
      // transcript (and onto the clipboard). Keep thinking minimal, don't ask
      // for thoughts, and still filter them out in extractText().
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL, includeThoughts: false },
    },
  };
}

/** Join the answer's text parts, skipping anything marked as a thought. Do not use `response.text`. */
export function extractText(res: Pick<GenerateContentResponse, "candidates">): string {
  const parts = res.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("")
    .trim();
}

export async function transcribe(apiKey: string, model: string, file: string, attempt: Attempt): Promise<string> {
  const audio = (await readFile(file)).toString("base64");
  const req = buildRequest(model, attempt);
  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({
    model: req.model,
    contents: [
      {
        role: "user",
        parts: [{ inlineData: { mimeType: "audio/ogg", data: audio } }, { text: req.prompt }],
      },
    ],
    config: req.config,
  });
  return extractText(res);
}
