import { describe, expect, it } from "vitest";
import { type SiteFile, computeLocalCid } from "@/ipfs/cid.js";

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

const FIXTURE: SiteFile[] = [
  { path: "assets/app.js", content: enc("console.log('geir');\n") },
  { path: "index.html", content: enc("<!doctype html><h1>geir</h1>\n") },
  { path: "nested/dir/data.json", content: enc('{"ok":true}\n') },
];

describe("computeLocalCid", () => {
  it("produces a stable CIDv1 for a fixed tree (locks importer opts + version)", async () => {
    // This value also matches the reference's options
    // ({ cidVersion: 1, wrapWithDirectory: true }) for the same input, so the
    // explicit rawLeaves in IMPORTER_OPTS does not change the CID.
    const cid = await computeLocalCid(FIXTURE);
    expect(cid).toBe("bafybeieqtv3rmt32fc4uhbzgnqf3mp334ro2c2ka2ywxy5nu6eeeds7xbe");
  });

  it("is deterministic across calls", async () => {
    const a = await computeLocalCid(FIXTURE);
    const b = await computeLocalCid(FIXTURE);
    expect(a).toBe(b);
  });
});
