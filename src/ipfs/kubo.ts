import type { SiteFile } from "@/ipfs/cid.js";
import type { PinMeta, PinResult, Pinner } from "@/ipfs/pinner.js";

interface KuboAddEntry {
  Name?: string;
  Hash?: string;
}

/**
 * Pick the root hash from a Kubo `/api/v0/add` response. The response is
 * newline-delimited JSON, one object per added entry; the wrapping directory
 * has an empty Name. Falls back to the last entry.
 */
export function parseKuboRoot(ndjson: string): string {
  const entries = ndjson
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as KuboAddEntry);
  const wrapDir = entries.find((entry) => entry.Name === "");
  const chosen = wrapDir ?? entries.at(-1);
  if (!chosen?.Hash) {
    throw new Error("Kubo add returned no root hash");
  }
  return chosen.Hash;
}

/** Pins a built site to a self-hosted Kubo node via its HTTP RPC API. */
export class KuboPinner implements Pinner {
  readonly name = "kubo" as const;

  constructor(
    private readonly apiUrl: string,
    private readonly authHeader?: string,
  ) {}

  async pin(files: SiteFile[], _meta: PinMeta): Promise<PinResult> {
    const form = new FormData();
    for (const file of files) {
      form.append("file", new Blob([file.content]), encodeURIComponent(file.path));
    }
    // Every param that affects the DAG is explicit so the CID matches what
    // computeLocalCid produces (and any divergence is caught by pinAndVerify).
    const query = new URLSearchParams({
      "cid-version": "1",
      "raw-leaves": "true",
      "wrap-with-directory": "true",
      chunker: "size-262144",
      hash: "sha2-256",
      pin: "true",
      "cid-base": "base32",
      quieter: "true",
    });
    const headers: Record<string, string> = {};
    if (this.authHeader) headers["Authorization"] = this.authHeader;

    const base = this.apiUrl.replace(/\/$/, "");
    const res = await fetch(`${base}/api/v0/add?${query.toString()}`, {
      method: "POST",
      headers,
      body: form,
    });
    if (!res.ok) {
      throw new Error(`Kubo add failed (${res.status}): ${await res.text()}`);
    }
    return { cid: parseKuboRoot(await res.text()), provider: "kubo" };
  }
}
