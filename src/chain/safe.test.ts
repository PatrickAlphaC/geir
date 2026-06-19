import { decodeFunctionData } from "viem";
import { describe, expect, it } from "vitest";
import { SAFE_ABI } from "@/chain/abi.js";
import { buildSafeTx, computeSafeTxHash, encodeExecTransaction } from "@/chain/safe.js";

const RESOLVER = "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41";
const SAFE = "0x20F41376c713072937eb02Be70ee1eD0D639966C";
const CALLDATA =
  "0x304e6aded66144af9c110917d1069042cf930972d07c4d404a22f1fe4db214fb9037e8df00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000026e30101701220b495f9948079e3107b5ee399a9a663572020cabf8c893a93ac3e3bdabad431dc0000000000000000000000000000000000000000000000000000";

describe("encodeExecTransaction", () => {
  it("encodes execTransaction with the signatures (selector + round-trip)", () => {
    const tx = buildSafeTx({ resolver: RESOLVER, calldata: CALLDATA, nonce: 25 });
    const signatures = `0x${"ab".repeat(65)}` as const;
    const data = encodeExecTransaction(tx, signatures);

    expect(data.startsWith("0x6a761202")).toBe(true);
    const decoded = decodeFunctionData({ abi: SAFE_ABI, data });
    const args = decoded.args as readonly unknown[];
    expect(decoded.functionName).toBe("execTransaction");
    expect(String(args[0]).toLowerCase()).toBe(RESOLVER.toLowerCase());
    expect(String(args[2])).toBe(CALLDATA);
    expect(String(args[9])).toBe(signatures);
  });
});

describe("buildSafeTx", () => {
  it("is a value-0 CALL to the resolver with zeroed gas params", () => {
    const tx = buildSafeTx({ resolver: RESOLVER, calldata: CALLDATA, nonce: 25 });
    expect(tx.to).toBe(RESOLVER);
    expect(tx.value).toBe(0n);
    expect(tx.operation).toBe(0);
    expect(tx.nonce).toBe(25n);
    expect(tx.gasToken).toBe("0x0000000000000000000000000000000000000000");
  });
});

describe("computeSafeTxHash", () => {
  it("produces a stable EIP-712 safeTxHash (regression lock)", () => {
    const tx = buildSafeTx({ resolver: RESOLVER, calldata: CALLDATA, nonce: 25 });
    expect(computeSafeTxHash({ safeAddress: SAFE, chainId: 1, tx })).toBe(
      "0xb47a1888d1ec316378dd90211368eed3662466a6351fd7ac434354e857a5f0b7",
    );
  });

  it("changes with chainId (domain separator depends on it)", () => {
    const tx = buildSafeTx({ resolver: RESOLVER, calldata: CALLDATA, nonce: 25 });
    const mainnet = computeSafeTxHash({ safeAddress: SAFE, chainId: 1, tx });
    const sepolia = computeSafeTxHash({ safeAddress: SAFE, chainId: 11155111, tx });
    expect(mainnet).not.toBe(sepolia);
  });
});
