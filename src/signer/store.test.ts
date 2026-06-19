import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadSignatures, saveSignature } from "@/signer/store.js";

describe("signature store", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "geir-sig-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns an empty record when none exists", () => {
    expect(loadSignatures(dir, "0xhash")).toEqual({ safeTxHash: "0xhash", signatures: [] });
  });

  it("persists a signature and reloads it", () => {
    saveSignature(dir, { safeTxHash: "0xhash", signer: "0xAbC", signature: "0xsig", timestamp: 1 });
    const record = loadSignatures(dir, "0xhash");
    expect(record.signatures).toHaveLength(1);
    expect(record.signatures[0]?.signer).toBe("0xAbC");
  });

  it("deduplicates by signer (case-insensitive), keeping the first", () => {
    saveSignature(dir, {
      safeTxHash: "0xhash",
      signer: "0xAbC",
      signature: "0xsig1",
      timestamp: 1,
    });
    const record = saveSignature(dir, {
      safeTxHash: "0xhash",
      signer: "0xabc",
      signature: "0xsig2",
      timestamp: 2,
    });
    expect(record.signatures).toHaveLength(1);
    expect(record.signatures[0]?.signature).toBe("0xsig1");
  });
});
