import { CID } from "multiformats/cid";
import { type Hex, toBytes, toHex } from "viem";

/**
 * IPFS CIDv1 -> EIP-1577 contenthash. The 0xe301 prefix is the IPFS namespace
 * (codec 0xe3, "ipfs-ns") as an unsigned varint, per ENSIP-7 / EIP-1577.
 */
export function cidToContenthash(cidString: string): Hex {
  const v1 = CID.parse(cidString).toV1();
  return toHex(new Uint8Array([0xe3, 0x01, ...v1.bytes]));
}

/**
 * EIP-1577 contenthash -> IPFS CIDv1 string, or null when it is not an IPFS
 * contenthash (e.g. IPNS / Swarm, an empty record, or a malformed value).
 */
export function contenthashToCid(contenthashHex: string): string | null {
  if (!contenthashHex || contenthashHex === "0x") return null;
  const bytes = toBytes(contenthashHex);
  if (bytes.length < 2 || bytes[0] !== 0xe3 || bytes[1] !== 0x01) return null;
  try {
    return CID.decode(bytes.slice(2)).toString();
  } catch {
    return null;
  }
}
