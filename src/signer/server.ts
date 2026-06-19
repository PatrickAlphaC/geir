import { existsSync, readFileSync } from "node:fs";
import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSignatures, saveSignature } from "@/signer/store.js";

export interface SignerTransaction {
  to: string;
  value: string;
  data: string;
  operation: number;
  safeTxGas: string;
  baseGas: string;
  gasPrice: string;
  gasToken: string;
  refundReceiver: string;
  nonce: number;
}

export interface SignerTxData {
  mode: "safe" | "eoa";
  ensName: string;
  chainId: number;
  /** The signing account: the Safe address (safe) or the EOA (eoa). */
  account: string;
  resolver: string;
  cid: string;
  contenthash: string;
  transaction: SignerTransaction;
  safeTxHash?: string;
  threshold?: number;
  owners?: string[];
}

function signerHtmlPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "..", "ui", "signer.html"), // built:  dist/signer -> dist/ui
    join(here, "..", "..", "ui", "signer.html"), // dev: src/signer -> <pkg>/ui
  ];
  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    throw new Error(`signer.html not found (looked in: ${candidates.join(", ")}). Reinstall geir.`);
  }
  return found;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

export interface ServeSignerOptions {
  txData: SignerTxData;
  /** Directory for signature records (`.geir/signatures`). */
  sigDir: string;
  port: number;
  /** Injected clock so signature timestamps are testable. */
  now: () => number;
  /** Encode the Safe execTransaction calldata from concatenated signatures. */
  buildExecCalldata?: (signatures: string) => string;
  onExecuted?: (hash: string) => void;
}

/** Start the local signing server (binds to 127.0.0.1). */
export function serveSigner(opts: ServeSignerOptions): Server {
  const html = readFileSync(signerHtmlPath(), "utf-8");
  const sigKey = opts.txData.safeTxHash ?? "";

  async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const { method, url } = req;
    if (method === "OPTIONS") return send(res, 204, "");
    if (method === "GET" && url === "/") return send(res, 200, html, "text/html");
    if (method === "GET" && url === "/tx-data") return sendJson(res, 200, opts.txData);
    if (method === "GET" && url === "/signatures") {
      return sendJson(res, 200, loadSignatures(opts.sigDir, sigKey));
    }
    if (method === "POST" && url === "/signatures") {
      const { signer, signature } = JSON.parse(await readBody(req)) as {
        signer: string;
        signature: string;
      };
      const record = saveSignature(opts.sigDir, {
        safeTxHash: sigKey,
        signer,
        signature,
        timestamp: opts.now(),
        transaction: opts.txData.transaction,
        cid: opts.txData.cid,
      });
      return sendJson(res, 200, record);
    }
    if (method === "GET" && url === "/exec") {
      const record = loadSignatures(opts.sigDir, sigKey);
      const threshold = opts.txData.threshold ?? 1;
      if (!opts.buildExecCalldata || record.signatures.length < threshold) {
        return sendJson(res, 200, {
          ready: false,
          have: record.signatures.length,
          need: threshold,
        });
      }
      const sorted = record.signatures.toSorted((a, b) =>
        a.signer.toLowerCase().localeCompare(b.signer.toLowerCase()),
      );
      const signatures = `0x${sorted.map((s) => s.signature.replace(/^0x/, "")).join("")}`;
      return sendJson(res, 200, {
        ready: true,
        to: opts.txData.account,
        data: opts.buildExecCalldata(signatures),
      });
    }
    if (method === "POST" && url === "/executed") {
      const { hash } = JSON.parse(await readBody(req)) as { hash: string };
      opts.onExecuted?.(hash);
      return sendJson(res, 200, { ok: true });
    }
    send(res, 404, "Not Found");
  }

  const server = createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    route(req, res).catch((err: unknown) => {
      sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
    });
  });
  server.listen(opts.port, "127.0.0.1");
  return server;
}

function send(res: ServerResponse, status: number, body: string, contentType = "text/plain"): void {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
}

function sendJson(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(value));
}
