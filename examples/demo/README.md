# geir demo

A tiny static site wired up with `geir`, so you can run the whole flow — **build → pin → tx (signer UI)** — against the local copy of geir in this repo.

## Setup (once)

From the **repo root** — this installs the workspace (linking geir into this demo) and builds it:

```sh
pnpm install
pnpm build
```

Then create your `.env`:

```sh
cd examples/demo
cp .env.example .env  # the default public RPC works for the demo
```

(The demo links geir as a workspace package, so rebuilding geir is reflected here immediately — no reinstall.)

## 1. Build

```sh
pnpm geir:build
```

Runs the configured build (`node build.mjs`) and writes `out/` plus a `release-manifest.json`.

## 2. Pin to IPFS

```sh
pnpm geir:pin
```

Computes the IPFS CID locally and writes it to `.geir/cid`. The demo ships with `ipfs.provider: "none"` (local CID only). To actually pin, edit `geir.config.ts`:

- **Pinata** — `ipfs: { provider: "pinata", jwtEnv: "PINATA_JWT", pinNamePrefix: "geir-demo-" }` and put your JWT in `.env`.
- **Your own node** — `ipfs: { provider: "kubo", apiUrl: "http://127.0.0.1:5001" }` (run `ipfs daemon`).

Either way geir verifies the provider returns the same CID it computed locally.

## 3. Prepare the transaction + open the signer

```sh
pnpm geir:tx
```

This reads `localsafe.eth`'s resolver and owner on-chain, builds the `setContenthash` transaction for the demo CID, prints the safe.global + localsafe.eth links, and opens the browser signer at <http://localhost:4321>.

Because `localsafe.eth` is owned by a 2-of-3 Safe, the UI shows the real multisig: connect a wallet, see whether you're an owner, and sign to watch the signature count.

> **Safe to explore:** connecting and signing have **zero on-chain effect** — signatures are saved locally in `.geir/signatures/`. Only clicking **Execute** with the Safe's full threshold submits a transaction (which would set `localsafe.eth`'s contenthash to this demo site). Don't click Execute unless you mean it.

Prefer no browser? `pnpm geir:tx:print` prints the same links + `safeTxHash` to the console.

## Try a different name

Point `ensName` in `geir.config.ts` at any ENS name to see how geir handles it — an EOA-owned name shows a single "Send Transaction" button instead of the multisig flow.
