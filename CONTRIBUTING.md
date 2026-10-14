# Contributing

Thanks for looking. The project is small on purpose; please keep it that way.

## Most wanted

1. **Run the Windows code on a real Windows machine.** `src/platform/windows.ts`
   and `ui/windows-autohotkey/dictate.ahk` are written but have never run. Try
   `npm run dictate -- --list`, a recording, and the hotkeys, and open an issue
   with what happened (including ffmpeg's output).
2. **Linux.** Not written yet. It is one file. See below.

## Adding a platform

Everything platform-specific lives behind one interface,
[`src/platform/types.ts`](src/platform/types.ts):

```ts
interface Platform {
  inputArgs(mic: string | undefined): Promise<string[]>; // ffmpeg input args for the mic
  listDevices(): Promise<AudioDevice[]>;                  // what --list prints
  copy(text: string): Promise<void>;                      // UTF-8 text -> clipboard
}
```

To add Linux:

1. Create `src/platform/linux.ts`. `macos.ts` is the reference.
   - Input: `["-f", "pulse", "-i", mic ?? "default"]` works on PulseAudio and PipeWire.
   - Devices: `pactl list short sources`.
   - Clipboard: `wl-copy` on Wayland, `xclip -selection clipboard` on X11. Pass
     UTF-8 explicitly (see the pbcopy comment in `macos.ts` for why).
2. Return it from `getPlatform()` in `src/platform/index.ts`.
3. Add a parser test next to the existing ones in `test/`.

Recording, the silence gate, the Gemini call and the retry logic are shared and
should not need to change.

## Ground rules

- **User-facing strings go in [`src/messages.ts`](src/messages.ts)**, in Persian.
  Code, comments and docs are in English.
- **Keep the load-bearing comments.** The Opus/WAV, thinking, silence-gate and
  pbcopy comments each record a real failure. If you change that code, update
  the comment, and don't delete it.
- `npm run typecheck && npm test` must pass.
