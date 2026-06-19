import type { GeirConfig } from "@/config/schema.js";
import type { Env } from "@/env.js";
import { type SiteFile, computeLocalCid } from "@/ipfs/cid.js";
import { DEFAULT_KUBO_API } from "@/ipfs/detect.js";
import { KuboPinner } from "@/ipfs/kubo.js";
import { PinataPinner } from "@/ipfs/pinata.js";

export type PinProvider = "pinata" | "kubo";

export interface PinResult {
  cid: string;
  provider: PinProvider;
}

export interface PinMeta {
  /** Human-readable pin label, e.g. "localsafe-1.2.3". */
  name: string;
}

export interface Pinner {
  readonly name: PinProvider;
  pin(files: SiteFile[], meta: PinMeta): Promise<PinResult>;
}

export class CidMismatchError extends Error {
  constructor(
    readonly localCid: string,
    readonly providerCid: string,
    readonly provider: PinProvider,
  ) {
    super(
      `CID mismatch: locally computed ${localCid} but ${provider} returned ${providerCid}. ` +
        "The CID set in ENS would not match what is hosted — investigate before publishing.",
    );
    this.name = "CidMismatchError";
  }
}

/**
 * Compute the CID locally, pin via the provider, and verify they match. The
 * local CID is authoritative and returned; a divergence is a hard error so a
 * bad pin can never reach ENS.
 */
export async function pinAndVerify(
  pinner: Pinner,
  files: SiteFile[],
  meta: PinMeta,
): Promise<string> {
  const localCid = await computeLocalCid(files);
  const result = await pinner.pin(files, meta);
  if (result.cid !== localCid) {
    throw new CidMismatchError(localCid, result.cid, result.provider);
  }
  return localCid;
}

/**
 * Build the configured pinner synchronously, or null when no remote pin should
 * happen here (provider "none"; "pinata" with no JWT; or "auto", which is
 * resolved asynchronously in the pin command after probing for a local node).
 */
export function createPinner(config: GeirConfig, env: Env): Pinner | null {
  const { ipfs } = config;
  switch (ipfs.provider) {
    case "pinata": {
      const jwt = env[ipfs.jwtEnv];
      return jwt ? new PinataPinner(jwt, ipfs.pinNamePrefix) : null;
    }
    case "kubo": {
      const auth = ipfs.apiAuthEnv ? env[ipfs.apiAuthEnv] : undefined;
      return new KuboPinner(ipfs.apiUrl ?? DEFAULT_KUBO_API, auth);
    }
    case "auto":
    case "none":
      return null;
  }
}
