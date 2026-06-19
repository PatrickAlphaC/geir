import { join } from "node:path";
import { runBuild } from "@/build.js";
import { readContenthash, readEnsState } from "@/chain/ens.js";
import type { CliValues } from "@/cli/flags.js";
import { log } from "@/cli/log.js";
import type { RunContext } from "@/context.js";
import { collectFiles, computeLocalCid } from "@/ipfs/cid.js";
import { contenthashToCid } from "@/ipfs/contenthash.js";

export async function runVerifyCommand(ctx: RunContext, values: CliValues): Promise<void> {
  log.step("Rebuilding from current source …");
  runBuild(ctx.cwd, ctx.config, { force: values.force ?? false });

  const files = collectFiles(join(ctx.cwd, ctx.config.build.outDir));
  const localCid = await computeLocalCid(files);
  log.info(`local CID:    ${localCid}`);

  const client = ctx.client();
  const ens = await readEnsState(client, ctx.config.ensName);
  const onChainCid = contenthashToCid(await readContenthash(client, ens.resolver, ens.node));
  log.info(`on-chain CID: ${onChainCid ?? "(none)"}`);

  if (localCid === onChainCid) {
    log.ok("MATCH — the current source matches the on-chain contenthash.");
  } else {
    log.error("MISMATCH — the current source does not match the on-chain contenthash.");
    process.exitCode = 1;
  }
}
