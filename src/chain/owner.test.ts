import { describe, expect, it } from "vitest";
import type { Hex } from "viem";
import type { GeirClient } from "@/chain/client.js";
import { NAME_WRAPPER_ADDRESSES } from "@/chain/constants.js";
import { detectOwnerKind, resolveControllingAddress, resolveOwnerInfo } from "@/chain/owner.js";

const SAFE: Hex = "0x20F41376c713072937eb02Be70ee1eD0D639966C";
const EOA: Hex = "0x277D26a45Add5775F21256159F089769892CEa5B";
const RESOLVED: Hex = "0x1111111111111111111111111111111111111111";

interface MockOpts {
  registryOwner: Hex;
  code?: Hex;
  wrapperOwner?: Hex;
  safe?: { nonce: bigint; threshold: bigint; owners: Hex[] };
  safeReverts?: boolean;
}

function mockClient(opts: MockOpts): GeirClient {
  const client = {
    getCode: async (_args: { address: Hex }): Promise<Hex | undefined> => opts.code,
    readContract: async ({ functionName }: { functionName: string }): Promise<unknown> => {
      switch (functionName) {
        case "owner":
          return opts.registryOwner;
        case "ownerOf":
          return opts.wrapperOwner;
        case "nonce":
        case "getThreshold":
        case "getOwners":
          if (opts.safeReverts) throw new Error("execution reverted");
          if (functionName === "nonce") return opts.safe?.nonce;
          if (functionName === "getThreshold") return opts.safe?.threshold;
          return opts.safe?.owners;
        default:
          throw new Error(`unexpected readContract: ${functionName}`);
      }
    },
  };
  return client as unknown as GeirClient;
}

function mainnetWrapper(): Hex {
  const wrapper = NAME_WRAPPER_ADDRESSES[1];
  if (!wrapper) throw new Error("missing mainnet NameWrapper address");
  return wrapper;
}

describe("detectOwnerKind", () => {
  it("classifies empty bytecode as an EOA", async () => {
    const client = mockClient({ registryOwner: EOA, code: "0x" });
    expect((await detectOwnerKind(client, EOA)).kind).toBe("eoa");
  });

  it("classifies a contract with working Safe reads as a Safe", async () => {
    const client = mockClient({
      registryOwner: SAFE,
      code: "0x6080",
      safe: { nonce: 25n, threshold: 2n, owners: [EOA] },
    });
    const result = await detectOwnerKind(client, SAFE);
    expect(result.kind).toBe("safe");
    expect(result.safe).toEqual({ nonce: 25, threshold: 2, owners: [EOA] });
  });

  it("throws for a contract that is not a Safe", async () => {
    const client = mockClient({ registryOwner: SAFE, code: "0x6080", safeReverts: true });
    await expect(detectOwnerKind(client, SAFE)).rejects.toThrow(/not a Gnosis Safe/);
  });
});

describe("resolveControllingAddress", () => {
  it("returns the registry owner directly when not wrapped", async () => {
    const client = mockClient({ registryOwner: RESOLVED });
    expect(await resolveControllingAddress(client, { name: "x.eth", chainId: 1 })).toEqual({
      address: RESOLVED,
      via: "registry",
    });
  });

  it("dereferences a wrapped name through the NameWrapper", async () => {
    const client = mockClient({ registryOwner: mainnetWrapper(), wrapperOwner: SAFE });
    expect(await resolveControllingAddress(client, { name: "x.eth", chainId: 1 })).toEqual({
      address: SAFE,
      via: "nameWrapper",
    });
  });
});

describe("resolveOwnerInfo", () => {
  it("auto-detects a Safe owner and reads its state", async () => {
    const client = mockClient({
      registryOwner: SAFE,
      code: "0x6080",
      safe: { nonce: 1n, threshold: 2n, owners: [EOA] },
    });
    const info = await resolveOwnerInfo(client, {
      name: "x.eth",
      chainId: 1,
      owner: { type: "auto" },
    });
    expect(info.kind).toBe("safe");
    expect(info.via).toBe("registry");
    expect(info.matchesOnchain).toBe(true);
    expect(info.safe?.threshold).toBe(2);
  });

  it("flags a config-pinned address that does not match the on-chain owner", async () => {
    const client = mockClient({ registryOwner: RESOLVED, code: "0x" });
    const info = await resolveOwnerInfo(client, {
      name: "x.eth",
      chainId: 1,
      owner: { type: "eoa", address: EOA },
    });
    expect(info.kind).toBe("eoa");
    expect(info.via).toBe("config");
    expect(info.matchesOnchain).toBe(false);
    expect(info.address).toBe(EOA);
  });
});
