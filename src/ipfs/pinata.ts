import type { SiteFile } from "@/ipfs/cid.js";
import type { PinMeta, PinResult, Pinner } from "@/ipfs/pinner.js";

const PINATA_API = "https://api.pinata.cloud";

interface PinListRow {
  ipfs_pin_hash: string;
  metadata?: { name?: string };
}

/** Pins a built site to Pinata's IPFS service and manages prior pins. */
export class PinataPinner implements Pinner {
  readonly name = "pinata" as const;

  constructor(
    private readonly jwt: string,
    private readonly pinNamePrefix: string,
  ) {}

  async pin(files: SiteFile[], meta: PinMeta): Promise<PinResult> {
    const form = new FormData();
    for (const file of files) {
      form.append("file", new Blob([file.content]), `out/${file.path}`);
    }
    form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));
    form.append("pinataMetadata", JSON.stringify({ name: meta.name }));

    const res = await fetch(`${PINATA_API}/pinning/pinFileToIPFS`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.jwt}` },
      body: form,
    });
    if (!res.ok) {
      throw new Error(`Pinata upload failed (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as { IpfsHash: string };
    return { cid: data.IpfsHash, provider: "pinata" };
  }

  /** All currently-pinned items whose metadata.name starts with our prefix. */
  async listPriorPins(): Promise<{ hash: string; name: string }[]> {
    const out: { hash: string; name: string }[] = [];
    const limit = 1000;
    let offset = 0;
    let done = false;
    while (!done) {
      const url = `${PINATA_API}/data/pinList?status=pinned&pageLimit=${limit}&pageOffset=${offset}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${this.jwt}` } });
      if (!res.ok) {
        throw new Error(`Pinata list failed (${res.status}): ${await res.text()}`);
      }
      const json = (await res.json()) as { rows?: PinListRow[] };
      const rows = json.rows ?? [];
      for (const row of rows) {
        const name = row.metadata?.name;
        if (name && name.startsWith(this.pinNamePrefix)) {
          out.push({ hash: row.ipfs_pin_hash, name });
        }
      }
      if (rows.length < limit) done = true;
      else offset += limit;
    }
    return out;
  }

  async unpin(hash: string): Promise<void> {
    const res = await fetch(`${PINATA_API}/pinning/unpin/${hash}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${this.jwt}` },
    });
    if (res.ok) return;
    const text = await res.text();
    // Pinata reports already-unpinned items in the body; treat as a no-op.
    if (text.toLowerCase().includes("not pinned")) return;
    throw new Error(`Pinata unpin failed (${res.status}): ${text}`);
  }

  /**
   * Remove every prior pin with our prefix except the current CID. Pinata is a
   * mirror of the current release, not an archive. Failures are collected and
   * returned rather than thrown, so one stuck pin does not abort the release.
   */
  async replaceStalePins(currentCid: string): Promise<{ removed: string[]; failed: string[] }> {
    const prior = await this.listPriorPins();
    const removed: string[] = [];
    const failed: string[] = [];
    for (const pin of prior) {
      if (pin.hash === currentCid) continue;
      try {
        await this.unpin(pin.hash);
        removed.push(pin.hash);
      } catch {
        failed.push(pin.hash);
      }
    }
    return { removed, failed };
  }
}
