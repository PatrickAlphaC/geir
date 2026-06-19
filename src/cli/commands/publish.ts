import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReleaseManifest } from "@/build.js";
import { readContenthash, readEnsState } from "@/chain/ens.js";
import { resolveOwnerInfo } from "@/chain/owner.js";
import type { CliValues } from "@/cli/flags.js";
import { log } from "@/cli/log.js";
import type { RunContext } from "@/context.js";
import { createRelease, ensureGhCli, renderReleaseNotes, resolveTag } from "@/github/release.js";
import { contenthashToCid } from "@/ipfs/contenthash.js";

function readState(stateDir: string, name: string): string {
  const path = join(stateDir, name);
  if (!existsSync(path)) {
    throw new Error(`.geir/${name} not found. Run \`geir release\` (build + pin) first.`);
  }
  return readFileSync(path, "utf-8").trim();
}

function readManifest(outDir: string): ReleaseManifest {
  const path = join(outDir, "release-manifest.json");
  if (!existsSync(path))
    throw new Error("release-manifest.json not found. Run `geir build` first.");
  return JSON.parse(readFileSync(path, "utf-8")) as ReleaseManifest;
}

export async function runPublishCommand(ctx: RunContext, values: CliValues): Promise<void> {
  ensureGhCli();
  const cid = readState(ctx.stateDir, "cid");
  const manifest = readManifest(join(ctx.cwd, ctx.config.build.outDir));

  const client = ctx.client();
  const ens = await readEnsState(client, ctx.config.ensName);
  const owner = await resolveOwnerInfo(client, {
    name: ctx.config.ensName,
    chainId: ctx.config.chainId,
    owner: ctx.config.owner,
  });
  const onChainHash = await readContenthash(client, ens.resolver, ens.node);
  const onChainCid = contenthashToCid(onChainHash);
  log.info(`built CID:    ${cid}`);
  log.info(`on-chain CID: ${onChainCid ?? "(none)"}`);
  if (onChainCid !== cid) {
    throw new Error(
      "On-chain contenthash does not match the built CID. Execute the setContenthash " +
        "transaction first (geir tx), or rebuild if the source changed.",
    );
  }

  const tag = resolveTag(manifest, values.tag);
  const title = tag.replace(/^v/, "");
  const notes = renderReleaseNotes({
    config: ctx.config,
    cid,
    contenthash: onChainHash,
    ownerAddress: owner.address,
    resolver: ens.resolver,
    manifest,
  });
  log.plain(notes);

  if (ctx.dryRun) {
    log.info("[dry-run] not creating the GitHub release.");
    return;
  }
  const output = createRelease({
    cwd: ctx.cwd,
    repo: ctx.config.github.repo,
    tag,
    target: manifest.git.commit,
    title,
    notes,
    draft: ctx.config.github.draft,
  });
  log.ok(`GitHub release created: ${output}`);
}
