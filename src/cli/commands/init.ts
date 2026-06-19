import type { CliValues } from "@/cli/flags.js";
import { log } from "@/cli/log.js";
import { type PackageManager, detectFramework, detectPackageManager } from "@/scaffold/detect.js";
import { configTemplate, envExampleTemplate } from "@/scaffold/templates.js";
import {
  type WriteResult,
  patchGitignore,
  patchPackageJson,
  writeFileIfAllowed,
  writeJustfile,
} from "@/scaffold/writers.js";

const PMS: readonly PackageManager[] = ["pnpm", "npm", "yarn", "bun"];

function resolvePm(flag: string | undefined, cwd: string): PackageManager {
  if (flag === undefined) return detectPackageManager(cwd);
  if (!(PMS as readonly string[]).includes(flag)) {
    throw new Error(`Unknown --pm "${flag}". Expected one of: ${PMS.join(", ")}.`);
  }
  return flag as PackageManager;
}

export function runInit(cwd: string, values: CliValues): void {
  const pm = resolvePm(values.pm, cwd);
  const framework = detectFramework(cwd);
  const force = values.force ?? false;

  const results: WriteResult[] = [
    writeFileIfAllowed(cwd, "geir.config.ts", configTemplate({ pm, framework }), force),
    writeFileIfAllowed(cwd, ".env.example", envExampleTemplate(), force),
    patchPackageJson(cwd),
  ];
  if (!values["no-justfile"]) results.push(writeJustfile(cwd, pm));
  results.push(patchGitignore(cwd, "out"));

  log.info(`Detected ${pm}${framework === "next" ? " + Next.js" : ""}.`);
  for (const result of results) log.info(`  ${result.action.padEnd(8)} ${result.file}`);

  log.plain("");
  log.plain("Next steps:");
  log.plain("  1. Fill in the TODOs in geir.config.ts (ENS name, github.repo).");
  log.plain("  2. cp .env.example .env  and add your RPC URL (+ optional PINATA_JWT).");
  log.plain(`  3. Run a release:  ${pm} run release patch`);
}
