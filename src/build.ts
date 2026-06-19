import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BuildIdStrategy, GeirConfig } from "@/config/schema.js";
import { type GitInfo, gitInfo } from "@/git.js";

export interface ReleaseManifest {
  name: string;
  version: string;
  builtAt: string;
  git: GitInfo;
}

export interface BuildResult {
  manifest: ReleaseManifest;
  outDir: string;
  fileCount: number;
  totalBytes: number;
}

/** Substitute ${version}, ${commit}, ${tag}, ${buildId} placeholders. */
export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\$\{(\w+)\}/g, (_match, key: string) => vars[key] ?? "");
}

export function resolveBuildId(strategy: BuildIdStrategy, git: GitInfo, version: string): string {
  if (strategy === "commit") return git.commit;
  if (strategy === "tag") return git.tag ?? `v${version}`;
  return `v${version}`;
}

export function readPackageVersion(cwd: string): string {
  const pkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf-8")) as { version?: string };
  return pkg.version ?? "0.0.0";
}

function dirStats(dir: string): { fileCount: number; totalBytes: number } {
  let fileCount = 0;
  let totalBytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = dirStats(full);
      fileCount += sub.fileCount;
      totalBytes += sub.totalBytes;
    } else if (entry.isFile()) {
      fileCount += 1;
      totalBytes += statSync(full).size;
    }
  }
  return { fileCount, totalBytes };
}

export interface RunBuildOptions {
  force?: boolean;
}

/**
 * Run the configured build command with the build-id env injected, then write
 * release-manifest.json into the output directory so it is pinned and
 * verifiable from IPFS.
 */
export function runBuild(
  cwd: string,
  config: GeirConfig,
  options: RunBuildOptions = {},
): BuildResult {
  const git = gitInfo(cwd);
  if (git.dirty && config.build.requireCleanTree && !options.force) {
    throw new Error(
      "Working tree has uncommitted changes. Release builds must come from a clean " +
        "checkout — the manifest embeds the commit. Commit/stash, or pass --force.",
    );
  }

  const version = readPackageVersion(cwd);
  const buildId = resolveBuildId(config.build.buildId, git, version);
  const vars: Record<string, string> = {
    version,
    commit: git.commit,
    tag: git.tag ?? `v${version}`,
    buildId,
  };

  const outDir = join(cwd, config.build.outDir);
  rmSync(outDir, { recursive: true, force: true });

  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const [key, value] of Object.entries(config.build.env)) {
    env[key] = interpolate(value, vars);
  }
  env[config.build.buildIdEnv] = buildId;

  execSync(config.build.command, { cwd, stdio: "inherit", env });

  if (!existsSync(outDir)) {
    throw new Error(
      `Build did not produce ${config.build.outDir}/. Check build.command and that the ` +
        "framework is configured for static export.",
    );
  }

  const manifest: ReleaseManifest = { name: config.name, version, builtAt: git.committedAt, git };
  writeFileSync(join(outDir, "release-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  const { fileCount, totalBytes } = dirStats(outDir);
  return { manifest, outDir, fileCount, totalBytes };
}
