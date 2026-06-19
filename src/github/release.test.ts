import { describe, expect, it } from "vitest";
import type { ReleaseManifest } from "@/build.js";
import type { GeirConfig } from "@/config/schema.js";
import { renderReleaseNotes, resolveTag } from "@/github/release.js";

const MANIFEST: ReleaseManifest = {
  name: "localsafe.eth",
  version: "1.2.3",
  builtAt: "2026-01-01T00:00:00Z",
  git: {
    commit: "abc1234def567",
    shortCommit: "abc1234",
    committedAt: "2026-01-01T00:00:00Z",
    tag: "v1.2.3",
    branch: "main",
    dirty: false,
  },
};

function config(): GeirConfig {
  return {
    ensName: "localsafe.eth",
    name: "localsafe.eth",
    chainId: 1,
    rpcEnv: "MAINNET_RPC_URL",
    build: {
      command: "b",
      outDir: "out",
      buildId: "commit",
      buildIdEnv: "V",
      env: {},
      requireCleanTree: true,
    },
    ipfs: { provider: "none" },
    owner: { type: "auto" },
    signer: {
      ui: false,
      port: 3000,
      localsafeAppUrl: "https://x",
    },
    github: {
      repo: "Cyfrin/localsafe.eth",
      gatewayHosts: ["ipfs.io", "cf-ipfs.com"],
      draft: false,
    },
  };
}

describe("resolveTag", () => {
  it("prefers an explicit override", () => {
    expect(resolveTag(MANIFEST, "v9.9.9")).toBe("v9.9.9");
  });

  it("falls back to the tag at HEAD", () => {
    expect(resolveTag(MANIFEST)).toBe("v1.2.3");
  });

  it("throws when HEAD has no tag and no override is given", () => {
    expect(() => resolveTag({ ...MANIFEST, git: { ...MANIFEST.git, tag: null } })).toThrow(
      /not at a version tag/,
    );
  });
});

describe("renderReleaseNotes", () => {
  it("includes CID, commit link, on-chain details, gateway links, and verify steps", () => {
    const notes = renderReleaseNotes({
      config: config(),
      cid: "bafyCID",
      contenthash: "0xe301aa",
      ownerAddress: "0xSafe",
      resolver: "0xRes",
      manifest: MANIFEST,
    });
    expect(notes).toContain("bafyCID");
    expect(notes).toContain("https://github.com/Cyfrin/localsafe.eth/commit/abc1234def567");
    expect(notes).toContain("0xe301aa");
    expect(notes).toContain("https://etherscan.io/address/0xSafe");
    expect(notes).toContain("https://ipfs.io/ipfs/bafyCID/");
    expect(notes).toContain("geir verify");
  });
});
