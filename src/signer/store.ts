import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface SignatureEntry {
  signer: string;
  signature: string;
  timestamp: number;
}

export interface SignatureRecord {
  safeTxHash: string;
  signatures: SignatureEntry[];
  transaction?: unknown;
  cid?: string;
}

function recordPath(dir: string, safeTxHash: string): string {
  return join(dir, `${safeTxHash}.json`);
}

export function loadSignatures(dir: string, safeTxHash: string): SignatureRecord {
  const path = recordPath(dir, safeTxHash);
  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, "utf-8")) as SignatureRecord;
  }
  return { safeTxHash, signatures: [] };
}

export interface SaveSignatureParams {
  safeTxHash: string;
  signer: string;
  signature: string;
  timestamp: number;
  transaction?: unknown;
  cid?: string;
}

/** Append a signature (deduplicated by signer) and persist the record. */
export function saveSignature(dir: string, params: SaveSignatureParams): SignatureRecord {
  mkdirSync(dir, { recursive: true });
  const record = loadSignatures(dir, params.safeTxHash);
  if (params.transaction !== undefined) record.transaction = params.transaction;
  if (params.cid !== undefined) record.cid = params.cid;

  const already = record.signatures.some(
    (s) => s.signer.toLowerCase() === params.signer.toLowerCase(),
  );
  if (!already) {
    record.signatures.push({
      signer: params.signer,
      signature: params.signature,
      timestamp: params.timestamp,
    });
    writeFileSync(recordPath(dir, params.safeTxHash), `${JSON.stringify(record, null, 2)}\n`);
  }
  return record;
}
