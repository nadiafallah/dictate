import { spawn } from "node:child_process";

export interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/** Run a command to completion, optionally feeding stdin. Never rejects on a non-zero exit. */
export function run(
  cmd: string,
  args: string[],
  opts: { input?: string; env?: NodeJS.ProcessEnv; daemonizes?: boolean } = {},
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    // Linux clipboard tools (xclip, wl-copy) fork a child that keeps owning the
    // selection and inherits our pipes, so "close" would never fire. For those,
    // don't capture output and resolve on "exit" instead.
    const child = spawn(cmd, args, {
      env: opts.env ?? process.env,
      stdio: ["pipe", opts.daemonizes ? "ignore" : "pipe", opts.daemonizes ? "ignore" : "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.setEncoding("utf8").on("data", (d) => (stdout += d));
    child.stderr?.setEncoding("utf8").on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on(opts.daemonizes ? "exit" : "close", (code) => resolve({ code, stdout, stderr }));
    child.stdin!.end(opts.input ?? "", "utf8");
  });
}
