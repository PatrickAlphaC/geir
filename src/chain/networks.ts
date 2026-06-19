import { type Chain, mainnet, sepolia } from "viem/chains";

export interface NetworkInfo {
  /** viem chain object (used to build the public client). */
  chain: Chain;
  /** Safe's chain short name, used in app.safe.global URLs (e.g. "eth", "sep"). */
  safeShortName: string;
}

const NETWORKS: Record<number, NetworkInfo> = {
  [mainnet.id]: { chain: mainnet, safeShortName: "eth" },
  [sepolia.id]: { chain: sepolia, safeShortName: "sep" },
};

export function networkInfo(chainId: number): NetworkInfo {
  const info = NETWORKS[chainId];
  if (!info) {
    const supported = Object.keys(NETWORKS).join(", ");
    throw new Error(`Unsupported chainId ${chainId}. geir supports: ${supported}.`);
  }
  return info;
}

/** Block-explorer base URL for a chain, e.g. "https://etherscan.io". */
export function explorerBase(chainId: number): string {
  return networkInfo(chainId).chain.blockExplorers?.default.url ?? "https://etherscan.io";
}
