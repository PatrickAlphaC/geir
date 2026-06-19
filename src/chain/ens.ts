import { type Hex, namehash } from "viem";
import { RESOLVER_ABI } from "@/chain/abi.js";
import type { GeirClient } from "@/chain/client.js";

export interface EnsState {
  /** namehash of the ENS name. */
  node: Hex;
  /** Current resolver contract for the name. */
  resolver: Hex;
}

/** Resolve the namehash and current resolver for an ENS name. */
export async function readEnsState(client: GeirClient, name: string): Promise<EnsState> {
  const node = namehash(name);
  const resolver = await client.getEnsResolver({ name });
  return { node, resolver };
}

/** Read the current on-chain contenthash record (raw EIP-1577 bytes). */
export async function readContenthash(client: GeirClient, resolver: Hex, node: Hex): Promise<Hex> {
  return client.readContract({
    address: resolver,
    abi: RESOLVER_ABI,
    functionName: "contenthash",
    args: [node],
  });
}
