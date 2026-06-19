import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Hex } from "viem";
import { ZERO_ADDRESS } from "@/chain/constants.js";
import { type EnsState, readEnsState } from "@/chain/ens.js";
import { type OwnerInfo, resolveOwnerInfo } from "@/chain/owner.js";
import {
  buildSafeTx,
  computeSafeTxHash,
  encodeExecTransaction,
  verifySafeTxHash,
} from "@/chain/safe.js";
import { buildEoaTx, buildSetContenthashCalldata } from "@/chain/tx.js";
import type { CliValues } from "@/cli/flags.js";
import { log } from "@/cli/log.js";
import type { RunContext } from "@/context.js";
import { cidToContenthash } from "@/ipfs/contenthash.js";
import { buildLocalsafeTx, buildSafeBatch } from "@/output/batch.js";
import { calldataDigest } from "@/output/digests.js";
import { renderEoaConsole, renderSafeConsole, writeTxArtifacts } from "@/output/console.js";
import { abiDecodeUrl, localsafeUrl, safeBuilderUrl } from "@/output/urls.js";
import { openBrowser } from "@/signer/open.js";
import { type SignerTransaction, type SignerTxData, serveSigner } from "@/signer/server.js";

interface TxParts {
  cid: string;
  contenthash: Hex;
  ens: EnsState;
  owner: OwnerInfo;
  calldata: Hex;
  cdDigest: Hex;
}

export async function runTxCommand(ctx: RunContext, values: CliValues): Promise<void> {
  const cidPath = join(ctx.stateDir, "cid");
  if (!existsSync(cidPath)) throw new Error(".geir/cid not found. Run `geir pin` first.");
  const cid = readFileSync(cidPath, "utf-8").trim();
  const contenthash = cidToContenthash(cid);

  const client = ctx.client();
  const ens = await readEnsState(client, ctx.config.ensName);
  const owner = await resolveOwnerInfo(client, {
    name: ctx.config.ensName,
    chainId: ctx.config.chainId,
    owner: ctx.config.owner,
  });
  const calldata = buildSetContenthashCalldata(ens.node, contenthash);
  const parts: TxParts = {
    cid,
    contenthash,
    ens,
    owner,
    calldata,
    cdDigest: calldataDigest(calldata),
  };

  if (owner.kind === "safe") {
    await renderSafe(ctx, values, parts);
  } else {
    renderEoa(ctx, values, parts);
  }
}

function toSignerTx(resolver: Hex, calldata: Hex, nonce: number): SignerTransaction {
  return {
    to: resolver,
    value: "0",
    data: calldata,
    operation: 0,
    safeTxGas: "0",
    baseGas: "0",
    gasPrice: "0",
    gasToken: ZERO_ADDRESS,
    refundReceiver: ZERO_ADDRESS,
    nonce,
  };
}

async function renderSafe(ctx: RunContext, values: CliValues, p: TxParts): Promise<void> {
  if (!p.owner.safe) throw new Error("Safe state unavailable for the resolved owner.");
  const { chainId, ensName } = ctx.config;
  const safe = p.owner.safe;
  const safeTx = buildSafeTx({ resolver: p.ens.resolver, calldata: p.calldata, nonce: safe.nonce });
  const safeTxHash = computeSafeTxHash({ safeAddress: p.owner.address, chainId, tx: safeTx });
  if (!ctx.dryRun) {
    await verifySafeTxHash(ctx.client(), {
      safeAddress: p.owner.address,
      tx: safeTx,
      localHash: safeTxHash,
    });
  }

  const localsafeTx = buildLocalsafeTx({
    resolver: p.ens.resolver,
    calldata: p.calldata,
    nonce: safe.nonce,
  });
  const summary = renderSafeConsole({
    ensName,
    chainId,
    cid: p.cid,
    contenthash: p.contenthash,
    node: p.ens.node,
    resolver: p.ens.resolver,
    owner: p.owner,
    safe,
    calldata: p.calldata,
    cdDigest: p.cdDigest,
    safeTxHash,
    urls: {
      localsafe: localsafeUrl({
        appBase: ctx.config.signer.localsafeAppUrl,
        safeAddress: p.owner.address,
        chainId,
        localsafeTx,
      }),
      safeBuilder: safeBuilderUrl(p.owner.address, chainId),
      abiDecode: abiDecodeUrl(p.calldata),
    },
  });
  log.plain(summary);
  writeTxArtifacts(ctx.stateDir, {
    summary,
    safeBatch: buildSafeBatch({
      ensName,
      safeAddress: p.owner.address,
      chainId,
      resolver: p.ens.resolver,
      node: p.ens.node,
      contenthash: p.contenthash,
      cid: p.cid,
      createdAt: Date.now(),
    }),
    localsafeTx,
  });
  log.info("Wrote .geir/tx-data/ (safe-batch.json, localsafe-tx.json, tx-summary.txt)");

  if (signerUiEnabled(ctx, values)) {
    startSignerUi(
      ctx,
      {
        mode: "safe",
        ensName,
        chainId,
        account: p.owner.address,
        resolver: p.ens.resolver,
        cid: p.cid,
        contenthash: p.contenthash,
        transaction: toSignerTx(p.ens.resolver, p.calldata, safe.nonce),
        safeTxHash,
        threshold: safe.threshold,
        owners: safe.owners.map((owner) => owner.toLowerCase()),
      },
      (signatures) => encodeExecTransaction(safeTx, signatures as Hex),
    );
  }
}

function renderEoa(ctx: RunContext, values: CliValues, p: TxParts): void {
  const { chainId, ensName } = ctx.config;
  const eoaTx = buildEoaTx(p.ens.resolver, p.calldata);
  const summary = renderEoaConsole({
    ensName,
    chainId,
    cid: p.cid,
    contenthash: p.contenthash,
    node: p.ens.node,
    resolver: p.ens.resolver,
    owner: p.owner,
    calldata: p.calldata,
    cdDigest: p.cdDigest,
    urls: { abiDecode: abiDecodeUrl(p.calldata) },
  });
  log.plain(summary);
  writeTxArtifacts(ctx.stateDir, { summary });

  if (signerUiEnabled(ctx, values)) {
    startSignerUi(ctx, {
      mode: "eoa",
      ensName,
      chainId,
      account: p.owner.address,
      resolver: p.ens.resolver,
      cid: p.cid,
      contenthash: p.contenthash,
      transaction: toSignerTx(eoaTx.to, eoaTx.data, 0),
    });
  }
}

function signerUiEnabled(ctx: RunContext, values: CliValues): boolean {
  if (values.headless) return false;
  if (values.ui || ctx.config.signer.ui) return true;
  const flag = ctx.env["GEIR_SIGNER_UI"];
  return flag === "true" || flag === "1";
}

function startSignerUi(
  ctx: RunContext,
  txData: SignerTxData,
  buildExecCalldata?: (signatures: string) => string,
): void {
  const server = serveSigner({
    txData,
    sigDir: join(ctx.stateDir, "signatures"),
    port: ctx.config.signer.port,
    now: () => Date.now(),
    ...(buildExecCalldata ? { buildExecCalldata } : {}),
    onExecuted: (hash) => log.ok(`transaction submitted on-chain: ${hash}`),
  });
  server.on("error", (err) => log.error(`signer server: ${err.message}`));
  const url = `http://localhost:${ctx.config.signer.port}`;
  log.step(`Signing UI: ${url}  (press Ctrl+C to stop)`);
  openBrowser(url);
}
