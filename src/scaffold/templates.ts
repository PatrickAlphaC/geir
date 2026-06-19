import type { Framework, PackageManager } from "@/scaffold/detect.js";

export const RELEASE_SCRIPTS: Record<string, string> = {
  release: "geir release",
  "release:build": "geir build",
  "release:pin": "geir pin",
  "release:tx": "geir tx",
  "release:publish": "geir publish",
  "release:verify": "geir verify",
};

export function configTemplate(opts: { pm: PackageManager; framework: Framework }): string {
  const isNext = opts.framework === "next";
  const buildId = isNext ? "commit" : "version";
  const buildIdEnv = isNext ? "NEXT_BUILD_ID" : "GEIR_BUILD_ID";
  const envLines = isNext
    ? ['      NEXT_PUBLIC_IPFS_BUILD: "true",']
    : ["      // geir injects the build id as the env var named by buildIdEnv"];

  return [
    `import { defineConfig } from "geir/config";`,
    "",
    "export default defineConfig({",
    '  ensName: "TODO.eth",',
    '  name: "TODO",',
    "  chainId: 1,",
    '  rpcEnv: "MAINNET_RPC_URL",',
    "  build: {",
    `    command: "${opts.pm} run build",`,
    '    outDir: "out",',
    `    buildId: "${buildId}",`,
    `    buildIdEnv: "${buildIdEnv}",`,
    "    env: {",
    ...envLines,
    "    },",
    "    requireCleanTree: true,",
    "  },",
    "  ipfs: {",
    '    provider: "pinata",',
    '    jwtEnv: "PINATA_JWT",',
    '    pinNamePrefix: "TODO-",',
    "  },",
    "  owner: {",
    '    type: "auto",',
    '    // address: "0x...", // optionally pin the Safe/EOA explicitly',
    "  },",
    "  signer: {",
    "    ui: false,",
    "    port: 3000,",
    '    localsafeAppUrl: "https://localsafe.eth.limo",',
    "  },",
    "  github: {",
    '    repo: "TODO/TODO",',
    '    gatewayHosts: ["ipfs.io", "cf-ipfs.com"],',
    "    draft: false,",
    "  },",
    "});",
    "",
  ].join("\n");
}

export function envExampleTemplate(): string {
  return [
    "# RPC endpoint for the chain your ENS name lives on (required)",
    "MAINNET_RPC_URL=",
    "",
    "# Pinata JWT for mirroring to Pinata (optional; omit for local-CID-only)",
    "PINATA_JWT=",
    "",
    "# Set to true to open the browser signing UI during release/tx (optional)",
    "GEIR_SIGNER_UI=",
    "",
  ].join("\n");
}

export function justfileBlock(pm: PackageManager): string {
  return [
    'release bump="patch":',
    `    ${pm} run release {{bump}}`,
    "",
    "release-publish:",
    `    ${pm} run release:publish`,
    "",
    "verify:",
    `    ${pm} run release:verify`,
  ].join("\n");
}
