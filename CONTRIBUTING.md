# Contributing

Thanks for looking. The project is small on purpose; please keep it that way.

## Most wanted

1. **Run the Windows code on a real Windows machine.** `src/platform/windows.ts`
   and `ui/windows-autohotkey/dictate.ahk` are written but have never run. Try
   `npm run dictate -- --list`, a recording, and the hotkeys, and open an issue
   with what happened (including ffmpeg's output).
2. **A Linux hotkey UI.** The Linux backend (`src/platform/linux.ts`) works
   from the command line. What's missing is the equivalent of the Hammerspoon
   card: a small script bound to a desktop keybinding that runs `--hold`, touches
   the stop file on the second press, and runs `--again`. It can read `LEVEL:<dB>`
   lines from stdout for a meter.

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

`src/platform/linux.ts` is the shortest complete example: PulseAudio input,
`pactl` for the device list, and `wl-copy`/`xclip`/`xsel` for the clipboard. To
add another platform, write one file like it, return it from `getPlatform()` in
`src/platform/index.ts`, and add a parser test in `test/`.

Recording, the silence gate, the Gemini call and the retry logic are shared and
should not need to change.

## Ground rules

- **User-facing strings go in [`src/messages.ts`](src/messages.ts)**, in Persian.
  Code, comments and docs are in English.
- **Keep the load-bearing comments.** The Opus/WAV, thinking, silence-gate and
  pbcopy comments each record a real failure. If you change that code, update
  the comment, and don't delete it.
- `npm run typecheck && npm test` must pass.
