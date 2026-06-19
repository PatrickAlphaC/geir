import { explorerBase, networkInfo } from "@/chain/networks.js";
import type { LocalsafeTx } from "@/output/batch.js";

/** A localsafe.eth deep link with the Safe transaction pre-filled for import. */
export function localsafeUrl(params: {
  appBase: string;
  safeAddress: string;
  chainId: number;
  localsafeTx: LocalsafeTx;
}): string {
  const json = JSON.stringify(params.localsafeTx);
  const b64 = Buffer.from(json, "utf-8").toString("base64");
  const encoded = encodeURIComponent(b64);
  return `${params.appBase}/#/safe/${params.safeAddress}?importTx=${encoded}&chainId=${params.chainId}`;
}

/** A safe.global link that opens the TX Builder app for the given Safe. */
export function safeBuilderUrl(safeAddress: string, chainId: number): string {
  const shortName = networkInfo(chainId).safeShortName;
  const appUrl = encodeURIComponent("https://apps-portal.safe.global/tx-builder");
  return `https://app.safe.global/apps/open?safe=${shortName}:${safeAddress}&appUrl=${appUrl}`;
}

/** Human-browsable gateway URLs for a CID, one per configured gateway host. */
export function gatewayBrowseUrls(cid: string, hosts: string[]): string[] {
  return hosts.map((host) => `https://${host}/ipfs/${cid}/`);
}

export function explorerAddressUrl(chainId: number, address: string): string {
  return `${explorerBase(chainId)}/address/${address}`;
}

export function abiDecodeUrl(calldata: string): string {
  return `https://tools.cyfrin.io/abi-encoding?data=${calldata}`;
}
