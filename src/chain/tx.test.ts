import { describe, expect, it } from "vitest";
import { namehash } from "viem";
import { buildEoaTx, buildSetContenthashCalldata } from "@/chain/tx.js";

describe("buildSetContenthashCalldata", () => {
  it("matches the real on-chain patrickalphac.eth setContenthash calldata", () => {
    const node = namehash("patrickalphac.eth");
    const contenthash =
      "0xe30101701220b495f9948079e3107b5ee399a9a663572020cabf8c893a93ac3e3bdabad431dc";
    expect(buildSetContenthashCalldata(node, contenthash)).toBe(
      "0x304e6aded66144af9c110917d1069042cf930972d07c4d404a22f1fe4db214fb9037e8df00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000026e30101701220b495f9948079e3107b5ee399a9a663572020cabf8c893a93ac3e3bdabad431dc0000000000000000000000000000000000000000000000000000",
    );
  });
});

describe("buildEoaTx", () => {
  it("targets the resolver with value 0", () => {
    expect(buildEoaTx("0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41", "0xdeadbeef")).toEqual({
      to: "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41",
      value: "0x0",
      data: "0xdeadbeef",
    });
  });
});
