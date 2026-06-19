import { type Hex, keccak256, toBytes } from "viem";
import { ZERO_ADDRESS } from "@/chain/constants.js";

export interface SafeBatchTransaction {
  to: string;
  value: string;
  data: string | null;
  contractMethod: {
    inputs: { internalType: string; name: string; type: string }[];
    name: string;
    payable: boolean;
  };
  contractInputsValues: Record<string, string>;
}

export interface SafeBatchFile {
  version: string;
  chainId: string;
  createdAt: number;
  meta: {
    name: string;
    description: string;
    txBuilderVersion: string;
    createdFromSafeAddress: string;
    createdFromOwnerAddress: string;
    checksum: string;
  };
  transactions: SafeBatchTransaction[];
}

const stringifyReplacer = (_key: string, value: unknown): unknown =>
  value === undefined ? null : value;

/**
 * Deterministic serialization for the Safe TX Builder batch checksum: sorts
 * keys and emits keys-then-values, matching safe-react-apps. Must stay
 * byte-identical or the Safe TX Builder rejects the imported file.
 */
export function serializeJsonObject(json: unknown): string {
  if (Array.isArray(json)) {
    return `[${json.map(serializeJsonObject).join(",")}]`;
  }
  if (typeof json === "object" && json !== null) {
    const obj = json as Record<string, unknown>;
    const keys = Object.keys(obj).toSorted();
    let acc = `{${JSON.stringify(keys, stringifyReplacer)}`;
    for (const key of keys) {
      acc += `${serializeJsonObject(obj[key])},`;
    }
    return `${acc}}`;
  }
  return JSON.stringify(json, stringifyReplacer);
}

/** keccak256 of the canonical serialization with meta.name nulled. */
export function safeBatchChecksum(batchFile: SafeBatchFile): Hex {
  const stripped = { ...batchFile, meta: { ...batchFile.meta, name: null } };
  return keccak256(toBytes(serializeJsonObject(stripped)));
}

export interface SafeBatchParams {
  ensName: string;
  safeAddress: string;
  chainId: number;
  resolver: string;
  node: Hex;
  contenthash: Hex;
  cid: string;
  /** Injected for testability; callers pass Date.now(). */
  createdAt: number;
}

/** A Safe TX Builder batch file containing the single setContenthash call. */
export function buildSafeBatch(params: SafeBatchParams): SafeBatchFile {
  const batchFile: SafeBatchFile = {
    version: "1.0",
    chainId: String(params.chainId),
    createdAt: params.createdAt,
    meta: {
      name: `${params.ensName} contenthash → ${params.cid}`,
      description: `Set the contenthash for ${params.ensName} to IPFS CID ${params.cid}.`,
      txBuilderVersion: "1.18.0",
      createdFromSafeAddress: params.safeAddress,
      createdFromOwnerAddress: "",
      checksum: "",
    },
    transactions: [
      {
        to: params.resolver,
        value: "0",
        data: null,
        contractMethod: {
          inputs: [
            { internalType: "bytes32", name: "node", type: "bytes32" },
            { internalType: "bytes", name: "hash", type: "bytes" },
          ],
          name: "setContenthash",
          payable: false,
        },
        contractInputsValues: { node: params.node, hash: params.contenthash },
      },
    ],
  };
  batchFile.meta.checksum = safeBatchChecksum(batchFile);
  return batchFile;
}

export interface LocalsafeTx {
  tx: {
    data: {
      to: string;
      value: string;
      data: string;
      operation: number;
      safeTxGas: string;
      baseGas: string;
      gasPrice: string;
      gasToken: string;
      refundReceiver: string;
      nonce: number;
    };
    signatures: never[];
  };
}

/** The transaction payload localsafe.eth imports via its #/safe URL fragment. */
export function buildLocalsafeTx(params: {
  resolver: string;
  calldata: Hex;
  nonce: number;
}): LocalsafeTx {
  return {
    tx: {
      data: {
        to: params.resolver,
        value: "0",
        data: params.calldata,
        operation: 0,
        safeTxGas: "0",
        baseGas: "0",
        gasPrice: "0",
        gasToken: ZERO_ADDRESS,
        refundReceiver: ZERO_ADDRESS,
        nonce: params.nonce,
      },
      signatures: [],
    },
  };
}
