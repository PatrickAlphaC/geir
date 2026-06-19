import type { Hex } from "viem";

/** Version bump kinds accepted by `npm version`. */
export type BumpType =
  | "patch"
  | "minor"
  | "major"
  | "prepatch"
  | "preminor"
  | "premajor"
  | "prerelease";

/**
 * How the deterministic build id is derived. Absorbs the difference between
 * projects that key their build on the commit SHA vs. the release tag.
 */
export type BuildIdStrategy = "commit" | "tag" | "version";

export interface BuildConfig {
  /** Build command run in the consumer repo, e.g. "pnpm run build". */
  command: string;
  /** Static output directory relative to the repo root, e.g. "out". */
  outDir: string;
  /** Which value to inject as the build id. */
  buildId: BuildIdStrategy;
  /** Env var the build id is injected under, e.g. "NEXT_BUILD_ID". */
  buildIdEnv: string;
  /**
   * Extra env passed into the build command. Values may contain the
   * placeholders `${version}`, `${commit}`, `${tag}`, and `${buildId}`.
   */
  env: Record<string, string>;
  /** Refuse to build from a dirty working tree unless forced. */
  requireCleanTree: boolean;
}

/** Where the built site is pinned. The CID is always computed locally first. */
export type IpfsConfig =
  | { provider: "pinata"; jwtEnv: string; pinNamePrefix: string }
  | { provider: "kubo"; apiUrl?: string; apiAuthEnv?: string }
  /** Pin to a local Kubo node if one is running, else compute the CID only. */
  | { provider: "auto"; apiUrl?: string; apiAuthEnv?: string }
  | { provider: "none" };

/** Who controls the ENS name and therefore signs `setContenthash`. */
export type OwnerType = "auto" | "safe" | "eoa";

export interface OwnerConfig {
  /** "auto" detects Safe vs EOA on-chain; "safe"/"eoa" pin it explicitly. */
  type: OwnerType;
  /** The controlling address (a Safe or an EOA). Optional for "auto". */
  address?: Hex;
  /** Override the NameWrapper address for this chain (rarely needed). */
  nameWrapper?: Hex;
}

export interface SignerConfig {
  /** Launch the local browser signing UI. Overridable via env / --ui flag. */
  ui: boolean;
  /** Port for the local signer server. */
  port: number;
  /** Hosted Safe app used for the "open pre-filled" link. */
  localsafeAppUrl: string;
}

export interface GithubConfig {
  /** "owner/repo" used by `gh release create --repo`. */
  repo: string;
  /** IPFS gateway hosts linked in the release notes. */
  gatewayHosts: string[];
  /** Create the GitHub release as a draft. */
  draft: boolean;
}

export interface GeirConfig {
  /** ENS name whose contenthash is updated, e.g. "localsafe.eth". */
  ensName: string;
  /** Project display name embedded in the release manifest and notes. */
  name: string;
  /** EVM chain id the ENS name lives on (1 = mainnet). */
  chainId: number;
  /** Env var holding the RPC URL for `chainId`. */
  rpcEnv: string;
  build: BuildConfig;
  ipfs: IpfsConfig;
  owner: OwnerConfig;
  signer: SignerConfig;
  github: GithubConfig;
}

/** Identity helper giving consumer config files full type-checking. */
export function defineConfig(config: GeirConfig): GeirConfig {
  return config;
}
