import type { Hex } from "viem";

export const ZERO_ADDRESS: Hex = "0x0000000000000000000000000000000000000000";

/** Canonical ENS registry, identical across all chains ENS is deployed on. */
export const ENS_REGISTRY_ADDRESS: Hex = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";

/** ENS NameWrapper, per chain. A name owned by the wrapper is dereferenced via ownerOf. */
export const NAME_WRAPPER_ADDRESSES: Record<number, Hex> = {
  1: "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401",
  11155111: "0x0635513f179D50A207757E05759CbD106d7dFcE8",
};
