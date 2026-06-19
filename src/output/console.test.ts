import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Hex } from "viem";
import type { OwnerInfo } from "@/chain/owner.js";
import { renderEoaConsole, renderSafeConsole, writeTxArtifacts } from "@/output/console.js";

const NODE: Hex = "0xd66144af9c110917d1069042cf930972d07c4d404a22f1fe4db214fb9037e8df";
const CONTENTHASH: Hex =
  "0xe30101701220b495f9948079e3107b5ee399a9a663572020cabf8c893a93ac3e3bdabad431dc";
const RESOLVER: Hex = "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41";
const SAFE: Hex = "0x20F41376c713072937eb02Be70ee1eD0D639966C";
const EOA: Hex = "0x277D26a45Add5775F21256159F089769892CEa5B";

const safeOwner: OwnerInfo = {
  address: SAFE,
  kind: "safe",
  via: "registry",
  onchainOwner: SAFE,
  matchesOnchain: true,
  safe: { nonce: 25, threshold: 2, owners: [EOA, SAFE] },
};

describe("renderSafeConsole", () => {
  const base = {
    ensName: "patrickalphac.eth",
    chainId: 1,
    cid: "bafyCID",
    contenthash: CONTENTHASH,
    node: NODE,
    resolver: RESOLVER,
    safe: { nonce: 25, threshold: 2, owners: [EOA, SAFE] },
    calldata: "0x304e6ade" as Hex,
    cdDigest: "0xdigest" as Hex,
    safeTxHash: "0xsafehash" as Hex,
    urls: {
      localsafe: "https://localsafe.eth.limo/#/x",
      safeBuilder: "https://app.safe.global/x",
      abiDecode: "https://tools.cyfrin.io/x",
    },
  };

  it("includes the CID, safeTxHash, threshold, and both submit URLs", () => {
    const text = renderSafeConsole({ ...base, owner: safeOwner });
    expect(text).toContain("bafyCID");
    expect(text).toContain("0xsafehash");
    expect(text).toContain("2 of 2");
    expect(text).toContain("https://localsafe.eth.limo/#/x");
    expect(text).toContain("https://app.safe.global/x");
    expect(text).toContain("(Safe)");
  });

  it("warns when the signing Safe does not match the on-chain owner", () => {
    const text = renderSafeConsole({ ...base, owner: { ...safeOwner, matchesOnchain: false } });
    expect(text).toContain("does NOT match");
  });
});

describe("renderEoaConsole", () => {
  it("shows the raw tx and omits Safe-specific fields", () => {
    const text = renderEoaConsole({
      ensName: "me.eth",
      chainId: 1,
      cid: "bafyCID",
      contenthash: CONTENTHASH,
      node: NODE,
      resolver: RESOLVER,
      owner: {
        address: EOA,
        kind: "eoa",
        via: "registry",
        onchainOwner: EOA,
        matchesOnchain: true,
      },
      calldata: "0x304e6ade",
      cdDigest: "0xdigest",
      urls: { abiDecode: "https://tools.cyfrin.io/x" },
    });
    expect(text).toContain("(EOA)");
    expect(text).toContain(EOA);
    expect(text).not.toContain("safeTxHash");
    expect(text).not.toContain("threshold");
  });
});

describe("writeTxArtifacts", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "geir-art-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes only the summary for an EOA release", () => {
    const written = writeTxArtifacts(dir, { summary: "EOA SUMMARY" });
    expect(written).toHaveLength(1);
    expect(readFileSync(join(dir, "tx-data", "tx-summary.txt"), "utf-8")).toBe("EOA SUMMARY");
  });

  it("writes summary + batch + localsafe files for a Safe release", () => {
    const written = writeTxArtifacts(dir, {
      summary: "SAFE SUMMARY",
      safeBatch: {
        version: "1.0",
        chainId: "1",
        createdAt: 1,
        meta: {
          name: "n",
          description: "d",
          txBuilderVersion: "1.18.0",
          createdFromSafeAddress: SAFE,
          createdFromOwnerAddress: "",
          checksum: "0x",
        },
        transactions: [],
      },
      localsafeTx: {
        tx: {
          data: {
            to: RESOLVER,
            value: "0",
            data: "0x",
            operation: 0,
            safeTxGas: "0",
            baseGas: "0",
            gasPrice: "0",
            gasToken: "0x0",
            refundReceiver: "0x0",
            nonce: 1,
          },
          signatures: [],
        },
      },
    });
    expect(written).toHaveLength(3);
    expect(readdirSync(join(dir, "tx-data")).toSorted()).toEqual([
      "localsafe-tx.json",
      "safe-batch.json",
      "tx-summary.txt",
    ]);
  });
});
