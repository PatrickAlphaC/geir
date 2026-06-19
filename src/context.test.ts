import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GeirConfig } from "@/config/schema.js";
import { buildContext } from "@/context.js";

function makeConfig(rpcEnv: string): GeirConfig {
  return {
    ensName: "x.eth",
    name: "x",
    chainId: 1,
    rpcEnv,
    build: {
      command: "b",
      outDir: "out",
      buildId: "version",
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
    github: { repo: "me/x", gatewayHosts: ["ipfs.io"], draft: false },
  };
}

describe("buildContext", () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "geir-ctx-"));
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("exposes cwd, stateDir, and dry-run defaults", () => {
    const ctx = buildContext({ cwd: dir, config: makeConfig("GEIR_UNUSED_RPC") });
    expect(ctx.cwd).toBe(dir);
    expect(ctx.stateDir).toBe(join(dir, ".geir"));
    expect(ctx.dryRun).toBe(false);
  });

  it("throws a clear error when the RPC env var is missing", () => {
    const ctx = buildContext({ cwd: dir, config: makeConfig("GEIR_DEFINITELY_MISSING_RPC_VAR") });
    expect(() => ctx.client()).toThrow(/GEIR_DEFINITELY_MISSING_RPC_VAR not set/);
  });
});
