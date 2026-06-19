import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { GeirConfig } from "@/config/schema.js";

const CANDIDATES = ["geir.config.ts", "geir.config.mts", "geir.config.mjs", "geir.config.js"];

function locateConfig(cwd: string, explicit?: string): string {
  if (explicit) {
    const path = isAbsolute(explicit) ? explicit : join(cwd, explicit);
    if (!existsSync(path)) throw new Error(`Config not found at ${path}.`);
    return path;
  }
  for (const name of CANDIDATES) {
    const path = join(cwd, name);
    if (existsSync(path)) return path;
  }
  throw new Error(`No geir config found in ${cwd}. Run \`geir init\` to create one.`);
}

// jiti is loaded only for TypeScript configs; .mjs/.js use native import.
async function importDefault(path: string): Promise<unknown> {
  if (path.endsWith(".ts") || path.endsWith(".mts")) {
    const { createJiti } = await import("jiti");
    const jiti = createJiti(import.meta.url);
    return jiti.import(path, { default: true });
  }
  const mod = (await import(pathToFileURL(path).href)) as { default?: unknown };
  return mod.default;
}

export async function loadConfig(cwd: string, explicit?: string): Promise<GeirConfig> {
  const config = await importDefault(locateConfig(cwd, explicit));
  validateConfig(config);
  return config;
}

export function validateConfig(value: unknown): asserts value is GeirConfig {
  if (!value || typeof value !== "object") {
    throw new Error("geir config must export a default object (use defineConfig).");
  }
  const c = value as Partial<GeirConfig>;
  const problems: string[] = [];
  if (!c.ensName) problems.push("ensName is required");
  if (!c.name) problems.push("name is required");
  if (typeof c.chainId !== "number") problems.push("chainId must be a number");
  if (!c.rpcEnv) problems.push("rpcEnv is required");
  if (!c.build?.command) problems.push("build.command is required");
  if (!c.build?.outDir) problems.push("build.outDir is required");
  if (!c.ipfs?.provider) problems.push("ipfs.provider is required (pinata|kubo|none)");
  if (c.ipfs?.provider === "pinata" && !c.ipfs.jwtEnv)
    problems.push("ipfs.jwtEnv is required for pinata");
  if (c.ipfs?.provider === "kubo" && !c.ipfs.apiUrl)
    problems.push("ipfs.apiUrl is required for kubo");
  if (!c.owner?.type) problems.push("owner.type is required (auto|safe|eoa)");
  if (c.owner?.address && !c.owner.address.startsWith("0x"))
    problems.push("owner.address must be 0x-prefixed");
  if (!c.github?.repo?.includes("/")) problems.push("github.repo must be 'owner/repo'");
  if (problems.length > 0) {
    throw new Error(`Invalid geir config:\n  - ${problems.join("\n  - ")}`);
  }
}
