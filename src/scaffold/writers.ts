import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type PackageManager, hasJustfile } from "@/scaffold/detect.js";
import { RELEASE_SCRIPTS, justfileBlock } from "@/scaffold/templates.js";

export type WriteAction = "created" | "skipped" | "patched";
export interface WriteResult {
  file: string;
  action: WriteAction;
}

const JUST_MARKER_START = "# >>> geir >>>";
const JUST_MARKER_END = "# <<< geir <<<";

/** Write `name` unless it already exists (or `force` overwrites it). */
export function writeFileIfAllowed(
  cwd: string,
  name: string,
  content: string,
  force: boolean,
): WriteResult {
  const path = join(cwd, name);
  const existed = existsSync(path);
  if (existed && !force) return { file: name, action: "skipped" };
  writeFileSync(path, content);
  return { file: name, action: existed ? "patched" : "created" };
}

/** Add the release scripts to package.json without clobbering existing keys. */
export function patchPackageJson(cwd: string): WriteResult {
  const path = join(cwd, "package.json");
  if (!existsSync(path)) {
    throw new Error("package.json not found. Run `geir init` from a Node project root.");
  }
  const pkg = JSON.parse(readFileSync(path, "utf-8")) as { scripts?: Record<string, string> };
  const scripts = pkg.scripts ?? {};
  let changed = false;
  for (const [key, value] of Object.entries(RELEASE_SCRIPTS)) {
    if (!(key in scripts)) {
      scripts[key] = value;
      changed = true;
    }
  }
  if (!changed) return { file: "package.json", action: "skipped" };
  pkg.scripts = scripts;
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
  return { file: "package.json", action: "patched" };
}

function existingJustfile(cwd: string): string {
  for (const name of ["justfile", "Justfile", ".justfile"]) {
    const path = join(cwd, name);
    if (existsSync(path)) return path;
  }
  return join(cwd, "justfile");
}

/** Create a justfile, or append a fenced geir block to an existing one. */
export function writeJustfile(cwd: string, pm: PackageManager): WriteResult {
  const block = `${JUST_MARKER_START}\n${justfileBlock(pm)}\n${JUST_MARKER_END}\n`;
  if (!hasJustfile(cwd)) {
    writeFileSync(join(cwd, "justfile"), block);
    return { file: "justfile", action: "created" };
  }
  const path = existingJustfile(cwd);
  const existing = readFileSync(path, "utf-8");
  if (existing.includes(JUST_MARKER_START)) return { file: "justfile", action: "skipped" };
  writeFileSync(path, `${existing.replace(/\n*$/, "")}\n\n${block}`);
  return { file: "justfile", action: "patched" };
}

/** Ensure `.geir/`, the build output dir, and `.env` are gitignored. */
export function patchGitignore(cwd: string, outDir: string): WriteResult {
  const path = join(cwd, ".gitignore");
  const existed = existsSync(path);
  const existing = existed ? readFileSync(path, "utf-8") : "";
  const present = new Set(existing.split("\n").map((line) => line.trim()));
  const toAdd = [".geir/", `${outDir}/`, ".env"].filter((entry) => !present.has(entry));
  if (toAdd.length === 0) return { file: ".gitignore", action: "skipped" };
  const body = existing.replace(/\n*$/, "");
  const updated = body.length > 0 ? `${body}\n${toAdd.join("\n")}\n` : `${toAdd.join("\n")}\n`;
  writeFileSync(path, updated);
  return { file: ".gitignore", action: existed ? "patched" : "created" };
}
