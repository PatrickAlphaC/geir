import { type Hex, concat, keccak256, numberToHex, toBytes } from "viem";

/**
 * ERC-8213 calldata digest: keccak256( uint256(len(calldata)) ‖ calldata ).
 * Lets a signer independently verify the calldata they are approving.
 * https://erc8213.eth.limo/
 */
export function calldataDigest(calldataHex: Hex): Hex {
  const bytes = toBytes(calldataHex);
  const lenWord = numberToHex(bytes.length, { size: 32 });
  return keccak256(concat([toBytes(lenWord), bytes]));
}
