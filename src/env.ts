import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type Env = Record<string, string | undefined>;

/**
 * Read `<dir>/.env` (KEY=value, skipping blanks and # comments) and merge it
 * under process.env so the shell wins, matching the dotenv convention. Does
 * not mutate process.env.
 */
export function loadEnv(dir: string): Env {
  const fileEnv: Record<string, string> = {};
  const envPath = join(dir, ".env");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf-8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        fileEnv[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
      }
    }
  }
  return { ...fileEnv, ...process.env };
}
