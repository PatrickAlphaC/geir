import { defineConfig } from "geir/config";

export default defineConfig({
  // The tx/UI step reads this name's resolver + owner on-chain. localsafe.eth is
  // owned by a 2-of-3 Safe, so the signer UI shows a real multisig flow. Viewing
  // and signing are read-only; only "Execute" with the full threshold submits.
  // Change this to any ENS name to explore a different owner.
  ensName: "localsafe.eth",
  name: "geir demo site",
  chainId: 1,
  rpcEnv: "MAINNET_RPC_URL",

  build: {
    command: "node build.mjs",
    outDir: "out",
    buildId: "version",
    buildIdEnv: "GEIR_DEMO_BUILD_ID",
    env: {},
    // This demo lives inside the geir git repo, so don't enforce a clean tree.
    requireCleanTree: false,
  },

  // "none" computes the CID locally without contacting any service. To actually
  // pin, switch to one of these and set the matching env var / URL:
  //   ipfs: { provider: "pinata", jwtEnv: "PINATA_JWT", pinNamePrefix: "geir-demo-" },
  //   ipfs: { provider: "kubo", apiUrl: "http://127.0.0.1:5001" },
  ipfs: { provider: "none" },

  owner: { type: "auto" },

  signer: {
    ui: false,
    port: 4321,
    localsafeAppUrl: "https://localsafe.eth.limo",
  },

  // Only used by `geir publish`, which this demo does not run.
  github: { repo: "Cyfrin/localsafe.eth", gatewayHosts: ["ipfs.io", "dweb.link"], draft: false },
});
