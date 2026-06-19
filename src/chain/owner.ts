import { type Hex, isAddressEqual, namehash } from "viem";
import { ENS_REGISTRY_ABI, NAME_WRAPPER_ABI } from "@/chain/abi.js";
import type { GeirClient } from "@/chain/client.js";
import { ENS_REGISTRY_ADDRESS, NAME_WRAPPER_ADDRESSES } from "@/chain/constants.js";
import { type SafeState, readSafeState } from "@/chain/safe.js";
import type { OwnerConfig } from "@/config/schema.js";

export type OwnerKind = "safe" | "eoa";

export interface OwnerInfo {
  /** The address that signs/executes setContenthash. */
  address: Hex;
  kind: OwnerKind;
  /** How `address` was determined. */
  via: "registry" | "nameWrapper" | "config";
  /** The ENS controlling address read on-chain (for verification/warnings). */
  onchainOwner: Hex;
  /** Whether `address` equals the on-chain controlling address. */
  matchesOnchain: boolean;
  /** Present when kind === "safe". */
  safe?: SafeState;
}

/**
 * The address that controls an ENS name: the registry owner, dereferenced
 * through the NameWrapper when the registry owner is the wrapper contract.
 */
export async function resolveControllingAddress(
  client: GeirClient,
  params: { name: string; chainId: number; nameWrapper?: Hex },
): Promise<{ address: Hex; via: "registry" | "nameWrapper" }> {
  const node = namehash(params.name);
  const registryOwner = await client.readContract({
    address: ENS_REGISTRY_ADDRESS,
    abi: ENS_REGISTRY_ABI,
    functionName: "owner",
    args: [node],
  });
  const wrapper = params.nameWrapper ?? NAME_WRAPPER_ADDRESSES[params.chainId];
  if (wrapper && isAddressEqual(registryOwner, wrapper)) {
    const realOwner = await client.readContract({
      address: wrapper,
      abi: NAME_WRAPPER_ABI,
      functionName: "ownerOf",
      args: [BigInt(node)],
    });
    return { address: realOwner, via: "nameWrapper" };
  }
  return { address: registryOwner, via: "registry" };
}

/** Empty bytecode ⇒ EOA; otherwise probe Safe reads to confirm a Gnosis Safe. */
export async function detectOwnerKind(
  client: GeirClient,
  address: Hex,
): Promise<{ kind: OwnerKind; safe?: SafeState }> {
  const code = await client.getCode({ address });
  if (!code || code === "0x") {
    return { kind: "eoa" };
  }
  try {
    const safe = await readSafeState(client, address);
    return { kind: "safe", safe };
  } catch {
    throw new Error(
      `${address} has bytecode but is not a Gnosis Safe (Safe reads reverted). ` +
        "Set owner.type explicitly in geir.config.ts if this is a different account type.",
    );
  }
}

/** Resolve the signing address and its kind, honouring the configured override. */
export async function resolveOwnerInfo(
  client: GeirClient,
  params: { name: string; chainId: number; owner: OwnerConfig },
): Promise<OwnerInfo> {
  const onchain = await resolveControllingAddress(client, {
    name: params.name,
    chainId: params.chainId,
    ...(params.owner.nameWrapper ? { nameWrapper: params.owner.nameWrapper } : {}),
  });
  const address = params.owner.address ?? onchain.address;
  const via = params.owner.address ? "config" : onchain.via;
  const matchesOnchain = isAddressEqual(address, onchain.address);

  let kind: OwnerKind;
  let safe: SafeState | undefined;
  if (params.owner.type === "eoa") {
    kind = "eoa";
  } else if (params.owner.type === "safe") {
    kind = "safe";
    safe = await readSafeState(client, address);
  } else {
    const detected = await detectOwnerKind(client, address);
    kind = detected.kind;
    safe = detected.safe;
  }

  return {
    address,
    kind,
    via,
    onchainOwner: onchain.address,
    matchesOnchain,
    ...(safe ? { safe } : {}),
  };
}
