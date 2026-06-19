import { describe, expect, it } from "vitest";
import { validateConfig } from "@/config/load.js";
import type { GeirConfig } from "@/config/schema.js";

function valid(): GeirConfig {
  return {
    ensName: "x.eth",
    name: "x",
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
    ipfs: { provider: "pinata", jwtEnv: "PINATA_JWT", pinNamePrefix: "x-" },
    owner: { type: "auto" },
    signer: {
      ui: false,
      port: 3000,
      localsafeAppUrl: "https://x",
    },
    github: { repo: "me/x", gatewayHosts: ["ipfs.io"], draft: false },
  };
}

describe("validateConfig", () => {
  it("accepts a complete config", () => {
    expect(() => validateConfig(valid())).not.toThrow();
  });

  it("rejects a non-object default export", () => {
    expect(() => validateConfig(null)).toThrow(/default object/);
  });

  it("aggregates missing required fields", () => {
    expect(() => validateConfig({})).toThrow(/ensName is required/);
  });

  it("requires jwtEnv for the pinata provider", () => {
    expect(() =>
      validateConfig({ ...valid(), ipfs: { provider: "pinata", pinNamePrefix: "x-" } }),
    ).toThrow(/jwtEnv is required/);
  });

  it("requires apiUrl for the kubo provider", () => {
    expect(() => validateConfig({ ...valid(), ipfs: { provider: "kubo" } })).toThrow(
      /apiUrl is required/,
    );
  });

  it("requires github.repo to be owner/repo", () => {
    expect(() =>
      validateConfig({ ...valid(), github: { repo: "norepo", gatewayHosts: [], draft: false } }),
    ).toThrow(/owner\/repo/);
  });
});
