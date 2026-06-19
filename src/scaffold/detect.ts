import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";
export type Framework = "next" | "generic";

function readPkg(cwd: string): Record<string, unknown> | null {
  const path = join(cwd, "package.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function detectPackageManager(cwd: string): PackageManager {
  if (existsSync(join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(cwd, "yarn.lock"))) return "yarn";
  if (existsSync(join(cwd, "bun.lockb")) || existsSync(join(cwd, "bun.lock"))) return "bun";
  if (existsSync(join(cwd, "package-lock.json"))) return "npm";

  const field = readPkg(cwd)?.["packageManager"];
  const name = typeof field === "string" ? field.split("@")[0] : "";
  if (name === "pnpm" || name === "yarn" || name === "bun" || name === "npm") return name;
  return "pnpm";
}

export function hasJustfile(cwd: string): boolean {
  return ["justfile", "Justfile", ".justfile"].some((file) => existsSync(join(cwd, file)));
}

export function detectFramework(cwd: string): Framework {
  const pkg = readPkg(cwd);
  const deps = {
    ...(pkg?.["dependencies"] as Record<string, unknown> | undefined),
    ...(pkg?.["devDependencies"] as Record<string, unknown> | undefined),
  };
  return "next" in deps ? "next" : "generic";
}
