import { type Hex, encodeFunctionData } from "viem";
import { RESOLVER_ABI } from "@/chain/abi.js";

/** ABI-encode `setContenthash(node, hash)` calldata. */
export function buildSetContenthashCalldata(node: Hex, contenthash: Hex): Hex {
  return encodeFunctionData({
    abi: RESOLVER_ABI,
    functionName: "setContenthash",
    args: [node, contenthash],
  });
}

export interface EoaTx {
  to: Hex;
  value: "0x0";
  data: Hex;
}

/** The plain transaction an EOA owner sends directly to the resolver. */
export function buildEoaTx(resolver: Hex, calldata: Hex): EoaTx {
  return { to: resolver, value: "0x0", data: calldata };
}
