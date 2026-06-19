import { describe, expect, it } from "vitest";
import type { GeirConfig, IpfsConfig } from "@/config/schema.js";
import { type SiteFile, computeLocalCid } from "@/ipfs/cid.js";
import { KuboPinner, parseKuboRoot } from "@/ipfs/kubo.js";
import { PinataPinner } from "@/ipfs/pinata.js";
import { CidMismatchError, type Pinner, createPinner, pinAndVerify } from "@/ipfs/pinner.js";

const FIXTURE: SiteFile[] = [
  { path: "index.html", content: new TextEncoder().encode("<h1>hi</h1>\n") },
];

function fakePinner(cid: string): Pinner {
  return { name: "pinata", pin: () => Promise.resolve({ cid, provider: "pinata" }) };
}

function configWith(ipfs: IpfsConfig): GeirConfig {
  return {
    ensName: "x.eth",
    name: "x",
    chainId: 1,
    rpcEnv: "MAINNET_RPC_URL",
    build: {
      command: "b",
      outDir: "out",
      buildId: "version",
      buildIdEnv: "V",
      env: {},
      requireCleanTree: true,
    },
    ipfs,
    owner: { type: "auto" },
    signer: {
      ui: false,
      port: 3000,
      localsafeAppUrl: "https://localsafe.eth.limo",
    },
    github: { repo: "me/x", gatewayHosts: ["ipfs.io"], draft: false },
  };
}

describe("parseKuboRoot", () => {
  it("picks the wrap-directory entry (empty Name)", () => {
    const ndjson = [
      JSON.stringify({ Name: "index.html", Hash: "bafkleaf" }),
      JSON.stringify({ Name: "", Hash: "bafyroot" }),
    ].join("\n");
    expect(parseKuboRoot(ndjson)).toBe("bafyroot");
  });

  it("falls back to the last entry", () => {
    expect(parseKuboRoot(JSON.stringify({ Name: "x", Hash: "bafyonly" }))).toBe("bafyonly");
  });

  it("throws when the response has no hash", () => {
    expect(() => parseKuboRoot("")).toThrow(/no root hash/);
  });
});

describe("pinAndVerify", () => {
  it("returns the local CID when the provider agrees", async () => {
    const local = await computeLocalCid(FIXTURE);
    expect(await pinAndVerify(fakePinner(local), FIXTURE, { name: "x" })).toBe(local);
  });

  it("throws CidMismatchError when the provider disagrees", async () => {
    await expect(
      pinAndVerify(fakePinner("bafybogus"), FIXTURE, { name: "x" }),
    ).rejects.toBeInstanceOf(CidMismatchError);
  });
});

describe("createPinner", () => {
  it("returns null for the none provider", () => {
    expect(createPinner(configWith({ provider: "none" }), {})).toBeNull();
  });

  it("returns null for pinata without a JWT (local-CID-only)", () => {
    const config = configWith({ provider: "pinata", jwtEnv: "PINATA_JWT", pinNamePrefix: "p-" });
    expect(createPinner(config, {})).toBeNull();
  });

  it("returns a PinataPinner when the JWT is present", () => {
    const config = configWith({ provider: "pinata", jwtEnv: "PINATA_JWT", pinNamePrefix: "p-" });
    expect(createPinner(config, { PINATA_JWT: "jwt" })).toBeInstanceOf(PinataPinner);
  });

  it("returns a KuboPinner for the kubo provider", () => {
    const config = configWith({ provider: "kubo", apiUrl: "http://127.0.0.1:5001" });
    expect(createPinner(config, {})).toBeInstanceOf(KuboPinner);
  });

  it("defaults the kubo apiUrl when omitted", () => {
    expect(createPinner(configWith({ provider: "kubo" }), {})).toBeInstanceOf(KuboPinner);
  });

  it("returns null for the auto provider (resolved async in the pin command)", () => {
    expect(createPinner(configWith({ provider: "auto" }), {})).toBeNull();
  });
});
