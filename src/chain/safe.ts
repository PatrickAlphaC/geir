import { type Hex, encodeFunctionData, hashTypedData } from "viem";
import { SAFE_ABI, SAFE_TX_TYPES } from "@/chain/abi.js";
import type { GeirClient } from "@/chain/client.js";
import { ZERO_ADDRESS } from "@/chain/constants.js";

export interface SafeState {
  nonce: number;
  threshold: number;
  owners: Hex[];
}

/** Read a Safe's nonce, threshold, and owner set. */
export async function readSafeState(client: GeirClient, address: Hex): Promise<SafeState> {
  const [nonce, threshold, owners] = await Promise.all([
    client.readContract({ address, abi: SAFE_ABI, functionName: "nonce" }),
    client.readContract({ address, abi: SAFE_ABI, functionName: "getThreshold" }),
    client.readContract({ address, abi: SAFE_ABI, functionName: "getOwners" }),
  ]);
  return { nonce: Number(nonce), threshold: Number(threshold), owners: [...owners] };
}

export interface SafeTx {
  to: Hex;
  value: bigint;
  data: Hex;
  operation: number;
  safeTxGas: bigint;
  baseGas: bigint;
  gasPrice: bigint;
  gasToken: Hex;
  refundReceiver: Hex;
  nonce: bigint;
}

/** Build the SafeTx struct for a single setContenthash call (value 0, CALL). */
export function buildSafeTx(params: { resolver: Hex; calldata: Hex; nonce: number }): SafeTx {
  return {
    to: params.resolver,
    value: 0n,
    data: params.calldata,
    operation: 0,
    safeTxGas: 0n,
    baseGas: 0n,
    gasPrice: 0n,
    gasToken: ZERO_ADDRESS,
    refundReceiver: ZERO_ADDRESS,
    nonce: BigInt(params.nonce),
  };
}

/**
 * ABI-encode `Safe.execTransaction(...)` with the collected signatures. Done in
 * geir's own code (no browser/CDN dependency) — the signer UI just submits the
 * returned calldata.
 */
export function encodeExecTransaction(tx: SafeTx, signatures: Hex): Hex {
  return encodeFunctionData({
    abi: SAFE_ABI,
    functionName: "execTransaction",
    args: [
      tx.to,
      tx.value,
      tx.data,
      tx.operation,
      tx.safeTxGas,
      tx.baseGas,
      tx.gasPrice,
      tx.gasToken,
      tx.refundReceiver,
      signatures,
    ],
  });
}

/** EIP-712 safeTxHash for a SafeTx (the hash a signer approves). */
export function computeSafeTxHash(params: { safeAddress: Hex; chainId: number; tx: SafeTx }): Hex {
  return hashTypedData({
    domain: { chainId: params.chainId, verifyingContract: params.safeAddress },
    types: { SafeTx: SAFE_TX_TYPES.SafeTx },
    primaryType: "SafeTx",
    message: { ...params.tx },
  });
}

/**
 * Cross-check the locally computed safeTxHash against Safe.getTransactionHash().
 * A mismatch means SAFE_TX_TYPES does not match this Safe's version — refuse to
 * print a hash a signer's wallet would not reproduce.
 */
export async function verifySafeTxHash(
  client: GeirClient,
  params: { safeAddress: Hex; tx: SafeTx; localHash: Hex },
): Promise<void> {
  const t = params.tx;
  const onChain = await client.readContract({
    address: params.safeAddress,
    abi: SAFE_ABI,
    functionName: "getTransactionHash",
    args: [
      t.to,
      t.value,
      t.data,
      t.operation,
      t.safeTxGas,
      t.baseGas,
      t.gasPrice,
      t.gasToken,
      t.refundReceiver,
      t.nonce,
    ],
  });
  if (onChain !== params.localHash) {
    throw new Error(
      `safeTxHash mismatch: local ${params.localHash} vs on-chain ${onChain}. ` +
        "SAFE_TX_TYPES likely does not match this Safe's version.",
    );
  }
}
