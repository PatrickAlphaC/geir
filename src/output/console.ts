import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Hex } from "viem";
import type { OwnerInfo } from "@/chain/owner.js";
import type { SafeState } from "@/chain/safe.js";
import type { LocalsafeTx, SafeBatchFile } from "@/output/batch.js";

interface CommonRenderInput {
  ensName: string;
  chainId: number;
  cid: string;
  contenthash: Hex;
  node: Hex;
  resolver: Hex;
  owner: OwnerInfo;
  calldata: Hex;
  cdDigest: Hex;
}

export interface SafeRenderInput extends CommonRenderInput {
  safe: SafeState;
  safeTxHash: Hex;
  urls: { localsafe: string; safeBuilder: string; abiDecode: string };
}

export interface EoaRenderInput extends CommonRenderInput {
  urls: { abiDecode: string };
}

function callSection(node: Hex, contenthash: Hex): string[] {
  return [
    "  setContenthash(bytes32 node, bytes hash)",
    `    node:      ${node}`,
    `    hash:      ${contenthash}`,
  ];
}

/** Full human-readable summary for a Safe-owned release (console + tx-summary.txt). */
export function renderSafeConsole(input: SafeRenderInput): string {
  const ownerWarning = input.owner.matchesOnchain ? "" : "  ⚠ does NOT match the signing Safe";
  return [
    `${input.ensName} — release transaction (Safe)`,
    "================================================",
    "",
    `CID:           ${input.cid}`,
    `Contenthash:   ${input.contenthash}`,
    "",
    `ENS name:      ${input.ensName}`,
    `ENS namehash:  ${input.node}`,
    `ENS owner:     ${input.owner.onchainOwner}${ownerWarning}`,
    `Resolver:      ${input.resolver}`,
    "",
    `Safe:          ${input.owner.address}  (via ${input.owner.via})`,
    `  chain:       ${input.chainId}`,
    `  nonce:       ${input.safe.nonce}`,
    `  threshold:   ${input.safe.threshold} of ${input.safe.owners.length}`,
    "  owners:",
    ...input.safe.owners.map((o) => `    - ${o}`),
    "",
    "Transaction:",
    `  to:          ${input.resolver}`,
    "  value:       0",
    "  operation:   0 (CALL)",
    `  data:        ${input.calldata}`,
    "",
    ...callSection(input.node, input.contenthash),
    "",
    "Verification digests (https://erc8213.eth.limo/):",
    `  ERC-8213 calldata digest:  ${input.cdDigest}`,
    `  EIP-712 safeTxHash:        ${input.safeTxHash}`,
    "",
    "Decode the calldata:",
    `  ${input.urls.abiDecode}`,
    "",
    "Submit via Safe TX Builder (load .geir/tx-data/safe-batch.json):",
    `  ${input.urls.safeBuilder}`,
    "",
    "…or open localsafe.eth with the tx pre-filled:",
    `  ${input.urls.localsafe}`,
    "",
  ].join("\n");
}

/** Full human-readable summary for an EOA-owned release. */
export function renderEoaConsole(input: EoaRenderInput): string {
  const ownerWarning = input.owner.matchesOnchain ? "" : "  ⚠ does NOT match the on-chain owner";
  return [
    `${input.ensName} — release transaction (EOA)`,
    "================================================",
    "",
    `CID:           ${input.cid}`,
    `Contenthash:   ${input.contenthash}`,
    "",
    `ENS name:      ${input.ensName}`,
    `ENS namehash:  ${input.node}`,
    `Resolver:      ${input.resolver}`,
    `Owner (EOA):   ${input.owner.address}${ownerWarning}`,
    "",
    "Send this transaction from the owner account:",
    `  to:          ${input.resolver}`,
    "  value:       0",
    `  data:        ${input.calldata}`,
    "",
    ...callSection(input.node, input.contenthash),
    "",
    "Verification digest (https://erc8213.eth.limo/):",
    `  ERC-8213 calldata digest:  ${input.cdDigest}`,
    "",
    "Decode the calldata:",
    `  ${input.urls.abiDecode}`,
    "",
  ].join("\n");
}

export interface TxArtifacts {
  summary: string;
  safeBatch?: SafeBatchFile;
  localsafeTx?: LocalsafeTx;
}

/** Write tx-data artifacts under `<stateDir>/tx-data`, returning the paths written. */
export function writeTxArtifacts(stateDir: string, artifacts: TxArtifacts): string[] {
  const dir = join(stateDir, "tx-data");
  mkdirSync(dir, { recursive: true });
  const written: string[] = [];

  const summaryPath = join(dir, "tx-summary.txt");
  writeFileSync(summaryPath, artifacts.summary);
  written.push(summaryPath);

  if (artifacts.safeBatch) {
    const path = join(dir, "safe-batch.json");
    writeFileSync(path, `${JSON.stringify(artifacts.safeBatch, null, 2)}\n`);
    written.push(path);
  }
  if (artifacts.localsafeTx) {
    const path = join(dir, "localsafe-tx.json");
    writeFileSync(path, `${JSON.stringify(artifacts.localsafeTx, null, 2)}\n`);
    written.push(path);
  }
  return written;
}
