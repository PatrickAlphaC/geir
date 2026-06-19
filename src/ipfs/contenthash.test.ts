import { describe, expect, it } from "vitest";
import { cidToContenthash, contenthashToCid } from "@/ipfs/contenthash.js";

// A real on-chain pair from patrickalphac.eth.
const CID = "bafybeifusx4zjadz4mihwxxdtgu2my2xeaqmvp4mre5jhlb6hpnlvvbr3q";
const CONTENTHASH =
  "0xe30101701220b495f9948079e3107b5ee399a9a663572020cabf8c893a93ac3e3bdabad431dc";

describe("cidToContenthash", () => {
  it("encodes a CIDv1 with the 0xe301 IPFS prefix (matches the on-chain value)", () => {
    expect(cidToContenthash(CID)).toBe(CONTENTHASH);
  });

  it("upgrades a CIDv0 to v1 before encoding", () => {
    const v0 = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
    expect(cidToContenthash(v0).startsWith("0xe30101")).toBe(true);
  });
});

describe("contenthashToCid", () => {
  it("round-trips back to the original CID", () => {
    expect(contenthashToCid(CONTENTHASH)).toBe(CID);
  });

  it("returns null for an empty record", () => {
    expect(contenthashToCid("0x")).toBeNull();
    expect(contenthashToCid("")).toBeNull();
  });

  it("returns null for a non-IPFS namespace (IPNS 0xe5)", () => {
    expect(contenthashToCid("0xe5010172002408011220")).toBeNull();
  });

  it("returns null for malformed bytes after the IPFS prefix", () => {
    expect(contenthashToCid("0xe301ff")).toBeNull();
  });
});
