// One platform = one file implementing this. See CONTRIBUTING.md.

export interface AudioDevice {
  id: string;
  name: string;
}

export interface Platform {
  /** ffmpeg arguments that select the microphone (everything before the output options). */
  inputArgs(mic: string | undefined): Promise<string[]>;
  /** Microphones ffmpeg can see, in the id format inputArgs() accepts. */
  listDevices(): Promise<AudioDevice[]>;
  /** Put UTF-8 text on the system clipboard. */
  copy(text: string): Promise<void>;
}
