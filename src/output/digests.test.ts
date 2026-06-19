import { describe, expect, it } from "vitest";
import { calldataDigest } from "@/output/digests.js";

describe("calldataDigest", () => {
  it("for empty calldata equals keccak256 of the 32-byte zero length word", () => {
    expect(calldataDigest("0x")).toBe(
      "0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563",
    );
  });

  it("is deterministic and sensitive to the calldata", () => {
    const a = calldataDigest("0xdeadbeef");
    const b = calldataDigest("0xdeadbeef");
    const c = calldataDigest("0xdeadbeff");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
