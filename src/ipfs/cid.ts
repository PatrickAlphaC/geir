import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { MemoryBlockstore } from "blockstore-core";
import { importer } from "ipfs-unixfs-importer";

export interface SiteFile {
  /** Path relative to the build output root, e.g. "posts/index.html". */
  path: string;
  content: Uint8Array;
}

/**
 * UnixFS importer options. These determine the root CID, so they must stay
 * stable: the importer version is pinned, and we set cidVersion/rawLeaves
 * explicitly. cidVersion 1 already implies rawLeaves on importer >=16, and the
 * default chunker is fixed-size 262144 — the values a correctly-configured
 * Kubo `add` must also use for its CID to match what we compute here.
 */
export const IMPORTER_OPTS = {
  cidVersion: 1 as const,
  rawLeaves: true,
  wrapWithDirectory: true,
};

/**
 * Recursively collect files under `dir`. Entries are sorted by name: directory
 * link order feeds into the dag-pb directory node hash, so a stable sort is
 * required for a reproducible root CID.
 */
export function collectFiles(dir: string, prefix = ""): SiteFile[] {
  const files: SiteFile[] = [];
  const entries = readdirSync(dir, { withFileTypes: true }).toSorted((a, b) =>
    a.name.localeCompare(b.name),
  );
  for (const entry of entries) {
    const full = join(dir, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...collectFiles(full, rel));
    } else if (entry.isFile()) {
      files.push({ path: rel, content: readFileSync(full) });
    }
  }
  return files;
}

/** Compute the IPFS CIDv1 of `files` locally, without contacting any service. */
export async function computeLocalCid(files: SiteFile[]): Promise<string> {
  const blockstore = new MemoryBlockstore();
  let rootCid: string | undefined;
  for await (const entry of importer(files, blockstore, IMPORTER_OPTS)) {
    rootCid = entry.cid.toString();
  }
  if (rootCid === undefined) {
    throw new Error("computeLocalCid: no files to import");
  }
  return rootCid;
}
