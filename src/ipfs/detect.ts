import { execFileSync } from "node:child_process";

/** Default Kubo RPC API endpoint. */
export const DEFAULT_KUBO_API = "http://127.0.0.1:5001";

/** Probe whether a Kubo daemon is answering its RPC API at `apiUrl`. */
export async function isKuboReachable(apiUrl: string, timeoutMs = 1500): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Kubo's RPC requires POST; /api/v0/version is a cheap liveness check.
    const res = await fetch(`${apiUrl.replace(/\/$/, "")}/api/v0/version`, {
      method: "POST",
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Whether the `ipfs` CLI is on PATH (used only for a more helpful hint). */
export function ipfsCliInstalled(): boolean {
  try {
    execFileSync("ipfs", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
