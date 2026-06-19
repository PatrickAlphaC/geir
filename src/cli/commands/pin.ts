import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readPackageVersion } from "@/build.js";
import type { CliValues } from "@/cli/flags.js";
import { humanBytes, log } from "@/cli/log.js";
import type { RunContext } from "@/context.js";
import { collectFiles, computeLocalCid } from "@/ipfs/cid.js";
import { DEFAULT_KUBO_API, ipfsCliInstalled, isKuboReachable } from "@/ipfs/detect.js";
import { KuboPinner } from "@/ipfs/kubo.js";
import { PinataPinner } from "@/ipfs/pinata.js";
import { type PinMeta, type Pinner, createPinner, pinAndVerify } from "@/ipfs/pinner.js";

function pinName(ctx: RunContext): string {
  const { ipfs } = ctx.config;
  if (ipfs.provider === "pinata") return `${ipfs.pinNamePrefix}${readPackageVersion(ctx.cwd)}`;
  return ctx.config.name;
}

/** Resolve the pinner, probing for a local Kubo node when provider is "auto". */
async function resolvePinner(ctx: RunContext): Promise<Pinner | null> {
  const { ipfs } = ctx.config;
  if (ipfs.provider !== "auto") return createPinner(ctx.config, ctx.env);
  const apiUrl = ipfs.apiUrl ?? DEFAULT_KUBO_API;
  if (await isKuboReachable(apiUrl)) {
    log.ok(`detected a local IPFS (Kubo) node at ${apiUrl}`);
    const auth = ipfs.apiAuthEnv ? ctx.env[ipfs.apiAuthEnv] : undefined;
    return new KuboPinner(apiUrl, auth);
  }
  return null;
}

function skipReason(ctx: RunContext): string {
  const { ipfs } = ctx.config;
  if (ipfs.provider === "pinata") return `${ipfs.jwtEnv} not set — computing the local CID only.`;
  if (ipfs.provider === "auto") {
    const apiUrl = ipfs.apiUrl ?? DEFAULT_KUBO_API;
    const cliHint = ipfsCliInstalled()
      ? " (ipfs is installed — run `ipfs daemon` to pin automatically)"
      : "";
    return `no local IPFS node reachable at ${apiUrl} — computing the local CID only.${cliHint}`;
  }
  return 'ipfs.provider is "none" — computing the local CID only.';
}

export async function runPinCommand(ctx: RunContext, _values: CliValues): Promise<string> {
  const outDir = join(ctx.cwd, ctx.config.build.outDir);
  if (!existsSync(outDir)) {
    throw new Error(`${ctx.config.build.outDir}/ not found. Run \`geir build\` first.`);
  }
  const files = collectFiles(outDir);
  const total = files.reduce((sum, file) => sum + file.content.length, 0);
  log.info(`Collected ${files.length} files (${humanBytes(total)})`);

  const localCid = await computeLocalCid(files);
  log.ok(`local CID  ${localCid}`);

  const pinner = await resolvePinner(ctx);
  if (!pinner) {
    log.warn(skipReason(ctx));
    log.plain(`  pin manually with: ipfs add -r ${ctx.config.build.outDir}/`);
  } else if (ctx.dryRun) {
    log.info(`[dry-run] would pin to ${pinner.name}`);
  } else {
    log.step(`Pinning to ${pinner.name} …`);
    const meta: PinMeta = { name: pinName(ctx) };
    await pinAndVerify(pinner, files, meta);
    log.ok(`pinned to ${pinner.name} — CID matches the local computation`);
    if (pinner instanceof PinataPinner) {
      const { removed, failed } = await pinner.replaceStalePins(localCid);
      if (removed.length > 0) log.info(`  replaced ${removed.length} prior pin(s)`);
      if (failed.length > 0) log.warn(`  ${failed.length} stale pin(s) could not be removed`);
    }
  }

  mkdirSync(ctx.stateDir, { recursive: true });
  writeFileSync(join(ctx.stateDir, "cid"), `${localCid}\n`);
  return localCid;
}
