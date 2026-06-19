import { createPublicClient, http } from "viem";
import { networkInfo } from "@/chain/networks.js";

/** A read-only viem client bound to the configured chain + RPC. */
export function createClient(chainId: number, rpcUrl: string) {
  const { chain } = networkInfo(chainId);
  return createPublicClient({ chain, transport: http(rpcUrl) });
}

export type GeirClient = ReturnType<typeof createClient>;
