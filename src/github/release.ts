import { execFileSync } from "node:child_process";
import { unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ReleaseManifest } from "@/build.js";
import type { GeirConfig } from "@/config/schema.js";
import { explorerAddressUrl, gatewayBrowseUrls } from "@/output/urls.js";

/** Throw a clear error unless the gh CLI is installed and authenticated. */
export function ensureGhCli(): void {
  try {
    execFileSync("gh", ["auth", "status"], { stdio: ["ignore", "pipe", "pipe"] });
  } catch {
    throw new Error(
      "gh CLI not authenticated. Run `gh auth login` (or install it from " +
        "https://cli.github.com/) and retry.",
    );
  }
}

/** Pick the release tag: explicit override, else the tag at HEAD, else error. */
export function resolveTag(manifest: ReleaseManifest, override?: string): string {
  if (override) return override;
  if (manifest.git.tag) return manifest.git.tag;
  throw new Error(
    "HEAD is not at a version tag. Run `geir release <bump>` to create one, or pass --tag vX.Y.Z.",
  );
}

export interface ReleaseNotesInput {
  config: GeirConfig;
  cid: string;
  contenthash: string;
  ownerAddress: string;
  resolver: string;
  manifest: ReleaseManifest;
}

export function renderReleaseNotes(input: ReleaseNotesInput): string {
  const { config, manifest } = input;
  const repoUrl = `https://github.com/${config.github.repo}`;
  const browse = gatewayBrowseUrls(input.cid, config.github.gatewayHosts).map(
    (url) => `- [\`${url}\`](${url})`,
  );
  return [
    `## ${config.name} snapshot`,
    "",
    `**IPFS CID:** \`${input.cid}\``,
    "",
    `Pinned to IPFS and resolved via ENS at \`${config.ensName}\`.`,
    "",
    "### Build",
    "",
    `- Version: \`${manifest.version}\``,
    `- Commit: [\`${manifest.git.shortCommit}\`](${repoUrl}/commit/${manifest.git.commit})`,
    `- Committed: \`${manifest.builtAt}\``,
    "",
    "### On-chain",
    "",
    `- Contenthash: \`${input.contenthash}\``,
    `- Owner: [\`${input.ownerAddress}\`](${explorerAddressUrl(config.chainId, input.ownerAddress)})`,
    `- Resolver: [\`${input.resolver}\`](${explorerAddressUrl(config.chainId, input.resolver)})`,
    "",
    "### Browse",
    "",
    ...browse,
    "",
    "### Verify",
    "",
    "```",
    `git checkout ${manifest.git.shortCommit}`,
    "geir verify",
    `# expected CID: ${input.cid}`,
    "```",
    "",
  ].join("\n");
}

export interface CreateReleaseInput {
  cwd: string;
  repo: string;
  tag: string;
  /** Commit the release points at. */
  target: string;
  title: string;
  notes: string;
  draft: boolean;
}

/** Create the GitHub release via the gh CLI, returning its stdout. */
export function createRelease(input: CreateReleaseInput): string {
  const notesPath = join(tmpdir(), `geir-notes-${input.tag}-${input.target.slice(0, 7)}.md`);
  writeFileSync(notesPath, input.notes);
  try {
    const args = [
      "release",
      "create",
      input.tag,
      "--repo",
      input.repo,
      "--target",
      input.target,
      "--title",
      input.title,
      "--notes-file",
      notesPath,
    ];
    if (input.draft) args.push("--draft");
    try {
      return execFileSync("gh", args, { cwd: input.cwd, stdio: ["ignore", "pipe", "pipe"] })
        .toString()
        .trim();
    } catch (err) {
      const stderr = (err as { stderr?: Buffer }).stderr;
      throw new Error(`gh release create failed: ${stderr ? stderr.toString() : String(err)}`, {
        cause: err,
      });
    }
  } finally {
    unlinkSync(notesPath);
  }
}
