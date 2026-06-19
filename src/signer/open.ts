import { spawn } from "node:child_process";

/** Best-effort: open `url` in the default browser. Never throws. */
export function openBrowser(url: string): void {
  const command =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  try {
    const child = spawn(command, [url], {
      stdio: "ignore",
      detached: true,
      shell: process.platform === "win32",
    });
    child.on("error", () => {
      /* opening the browser is best-effort; the user can open the URL manually */
    });
    child.unref();
  } catch {
    /* non-fatal */
  }
}
