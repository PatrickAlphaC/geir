import { describe, expect, it } from "vitest";
import { buildSafeBatch, safeBatchChecksum, serializeJsonObject } from "@/output/batch.js";

const KNOWN_CID = "bafybeifusx4zjadz4mihwxxdtgu2my2xeaqmvp4mre5jhlb6hpnlvvbr3q";
const KNOWN_CH = "0xe30101701220b495f9948079e3107b5ee399a9a663572020cabf8c893a93ac3e3bdabad431dc";

describe("serializeJsonObject", () => {
  it("sorts keys and emits keys-then-values", () => {
    expect(serializeJsonObject({ b: 1, a: 2 })).toBe('{["a","b"]2,1,}');
  });

  it("handles nested arrays and objects", () => {
    expect(serializeJsonObject([{ x: 1 }])).toBe('[{["x"]1,}]');
  });
});

describe("buildSafeBatch", () => {
  const batch = buildSafeBatch({
    ensName: "example.eth",
    safeAddress: "0x20F41376c713072937eb02Be70ee1eD0D639966C",
    chainId: 1,
    resolver: "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41",
    node: `0x${"11".repeat(32)}`,
    contenthash: KNOWN_CH,
    cid: KNOWN_CID,
    createdAt: 1_700_000_000_000,
  });

  it("produces a stable checksum for fixed inputs", () => {
    expect(batch.meta.checksum).toBe(
      "0x010c03cdf0350d9b8b4f42ea1f4a9eec0db65ce0d9e716177fdd96f293907a83",
    );
  });

  it("carries the contenthash as the setContenthash hash arg", () => {
    expect(batch.transactions[0]?.contractInputsValues["hash"]).toBe(KNOWN_CH);
  });

  it("the checksum recomputes from the pre-finalization file (checksum blanked)", () => {
    const recomputed = safeBatchChecksum({ ...batch, meta: { ...batch.meta, checksum: "" } });
    expect(recomputed).toBe(batch.meta.checksum);
  });
});
