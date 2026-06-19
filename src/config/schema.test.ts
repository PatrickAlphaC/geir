import { describe, expect, it } from "vitest";
import { defineConfig } from "@/config/schema.js";

describe("defineConfig", () => {
  it("returns its input unchanged (and resolves the @/ alias under vitest)", () => {
    const config = defineConfig({
      ensName: "example.eth",
      name: "example",
      chainId: 1,
      rpcEnv: "MAINNET_RPC_URL",
      build: {
        command: "pnpm run build",
        outDir: "out",
        buildId: "commit",
        buildIdEnv: "NEXT_BUILD_ID",
        env: {},
        requireCleanTree: true,
      },
      ipfs: { provider: "pinata", jwtEnv: "PINATA_JWT", pinNamePrefix: "example-" },
      owner: { type: "auto" },
      signer: {
        ui: false,
        port: 3000,
        localsafeAppUrl: "https://localsafe.eth.limo",
      },
      github: { repo: "me/example", gatewayHosts: ["ipfs.io"], draft: false },
    });

    expect(config.ensName).toBe("example.eth");
    expect(config.ipfs.provider).toBe("pinata");
  });
});
