# geir

**G**itHub · **E**NS · **I**PFS · **R**elease — a release tool for static-site projects that publish to IPFS and resolve through an ENS `contenthash`.

`geir` does one job end to end:

1. **Build** your static site and stamp a reproducible release manifest.
2. **Pin** it to IPFS — computing the CID locally and verifying the provider returns the same one.
3. **Prepare** the ENS `setContenthash` transaction — printing everything you need to sign (and, optionally, popping a browser UI to sign + execute).
4. **Publish** a GitHub release once the new contenthash is live on-chain.

It auto-detects whether the ENS name is owned by a **Gnosis Safe** or a plain **EOA** and adapts the signing flow accordingly.

## Install

```sh
pnpm add -D @patrickalphac/geir
geir init
```

`geir init` detects your package manager + framework and scaffolds:

- `geir.config.ts` — your settings (with `TODO`s to fill in)
- `.env.example` — the env vars geir reads
- `release` scripts in `package.json`
- a `justfile` block (`just release patch`, `just release-publish`, `just verify`)
- `.gitignore` entries for `.geir/`, your build output, and `.env`

Then fill in the `geir.config.ts` TODOs, `cp .env.example .env` and add your RPC URL, and you're ready.

## The release flow

Releasing is **two phases**, because the on-chain step needs a human with a wallet:

```sh
just release patch          # bump + build + pin + print the tx to sign
#   → sign & execute the setContenthash tx (via the printed links, or `--ui`)
#   → git push --follow-tags   (geir offers to do this for you)
just release-publish        # verify the contenthash is live, then cut the GitHub release
```

`geir release` stops after preparing the transaction. Once the Safe/EOA transaction is executed on-chain and the tag is pushed, `geir publish` verifies that ENS actually points at the built CID before creating the release.

## Signing

By default geir **prints** everything to the console:

- For a **Safe**: a [localsafe.eth](https://localsafe.eth.limo) import link, a [safe.global](https://app.safe.global) TX Builder link, the raw calldata, the EIP-712 `safeTxHash` (cross-checked against the Safe contract), and an ERC-8213 calldata digest. A `safe-batch.json` is written to `.geir/tx-data/` for the TX Builder.
- For an **EOA**: the raw `{to, value, data}` transaction to send from the owner account.

Set `GEIR_SIGNER_UI=true` (or pass `--ui`) to also open a local browser UI that connects a browser-extension wallet (via EIP-6963) and **signs + executes** in place — collecting signatures up to the Safe threshold and calling `execTransaction`, or sending the single transaction for an EOA. The UI loads no third-party/CDN code; geir's own code builds all calldata. Pass `--headless` to force it off.

## Commands

| Command                                    | What it does                                                   |
| ------------------------------------------ | -------------------------------------------------------------- |
| `geir init`                                | Scaffold config + scripts into the repo                        |
| `geir release [patch\|minor\|major\|pre*]` | bump → build → pin → prepare tx (+ optional `--ui`)            |
| `geir build`                               | Run the configured build and write `release-manifest.json`     |
| `geir pin`                                 | Compute the local CID, pin via the provider, verify they match |
| `geir tx`                                  | Prepare the `setContenthash` transaction (links + `--ui`)      |
| `geir publish [--tag vX.Y.Z]`              | Verify on-chain contenthash, then `gh release create`          |
| `geir verify`                              | Rebuild and compare the local CID to the on-chain contenthash  |

Global flags: `--config <path>`, `--dry-run`, `--quiet`, `--no-color`, `--force`, `--ui`/`--headless`, `--push`/`--no-push`.

## Configuration

`geir.config.ts` (loaded with [jiti](https://github.com/unjs/jiti); `.mjs`/`.js`/`.json` also work):

```ts
import { defineConfig } from "@patrickalphac/geir/config";

export default defineConfig({
  ensName: "localsafe.eth",
  name: "localsafe.eth",
  chainId: 1,
  rpcEnv: "MAINNET_RPC_URL",
  build: {
    command: "pnpm run build",
    outDir: "out",
    buildId: "commit", // "commit" | "tag" | "version" — the deterministic build id
    buildIdEnv: "NEXT_BUILD_ID", // env var the build id is injected under
    env: { NEXT_PUBLIC_IPFS_BUILD: "true" }, // extra build env (${version}/${commit}/${tag} interpolated)
    requireCleanTree: true,
  },
  ipfs: { provider: "pinata", jwtEnv: "PINATA_JWT", pinNamePrefix: "localsafe-" },
  // ipfs: { provider: "kubo", apiUrl: "http://127.0.0.1:5001" },  // your own node (required)
  // ipfs: { provider: "auto" },                                   // local Kubo node if running, else CID-only
  // ipfs: { provider: "none" },                                   // local CID only, never pins
  owner: { type: "auto" }, // "auto" detects Safe vs EOA; or pin { type: "safe", address: "0x…" }
  signer: {
    ui: false,
    port: 3000,
    localsafeAppUrl: "https://localsafe.eth.limo",
  },
  github: { repo: "Cyfrin/localsafe.eth", gatewayHosts: ["ipfs.io", "cf-ipfs.com"], draft: false },
});
```

### Environment variables

| Var                                  | Required     | Purpose                                                         |
| ------------------------------------ | ------------ | --------------------------------------------------------------- |
| `MAINNET_RPC_URL` (or your `rpcEnv`) | yes          | viem client for ENS/Safe reads and the `safeTxHash` cross-check |
| `PINATA_JWT` (or your `jwtEnv`)      | for `pinata` | mirror to Pinata; omit for local-CID-only                       |
| `GEIR_SIGNER_UI`                     | optional     | `true` opens the browser signer during `release`/`tx`           |

The GitHub release uses the [`gh` CLI](https://cli.github.com/) and its existing auth.

## Why it's trustworthy

- The CID is **always computed locally** from the build output; pinning to Pinata/Kubo then **verifies** the provider returns the identical CID before anything touches ENS.
- The Safe `safeTxHash` is computed with viem **and** cross-checked against `Safe.getTransactionHash()` on-chain, so the hash you sign matches what your hardware wallet shows.
- `release-manifest.json` embeds the commit and is pinned with the site, so any release can be rebuilt and re-verified with `geir verify`.

## Publishing geir itself

Maintainers: see [PUBLISHING.md](PUBLISHING.md) for the npm release steps.

## License

MIT
