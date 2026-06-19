import { mkdtempSync, rmSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type SignerTxData, serveSigner } from "@/signer/server.js";

const TX_DATA: SignerTxData = {
  mode: "safe",
  ensName: "x.eth",
  chainId: 1,
  account: "0xSafe",
  resolver: "0xRes",
  cid: "bafyCID",
  contenthash: "0xe301",
  transaction: {
    to: "0xRes",
    value: "0",
    data: "0x",
    operation: 0,
    safeTxGas: "0",
    baseGas: "0",
    gasPrice: "0",
    gasToken: "0x0",
    refundReceiver: "0x0",
    nonce: 1,
  },
  safeTxHash: "0xhash",
  threshold: 2,
  owners: ["0xabc"],
};

describe("serveSigner", () => {
  let server: Server;
  let baseUrl: string;
  let dir: string;
  let executed: string[];

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), "geir-srv-"));
    executed = [];
    server = serveSigner({
      txData: TX_DATA,
      sigDir: dir,
      port: 0,
      now: () => 12345,
      buildExecCalldata: (signatures) => `0xEXEC${signatures}`,
      onExecuted: (hash) => executed.push(hash),
    });
    await new Promise<void>((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(dir, { recursive: true, force: true });
  });

  it("serves the signer HTML at /", async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("Sign ENS Update");
  });

  it("serves tx-data as JSON", async () => {
    const data = (await (await fetch(`${baseUrl}/tx-data`)).json()) as SignerTxData;
    expect(data.mode).toBe("safe");
    expect(data.safeTxHash).toBe("0xhash");
  });

  it("/exec is not ready below the threshold", async () => {
    const res = (await (await fetch(`${baseUrl}/exec`)).json()) as { ready: boolean; need: number };
    expect(res.ready).toBe(false);
    expect(res.need).toBe(2);
  });

  it("/exec builds calldata from sorted signatures once the threshold is met", async () => {
    const post = (signer: string, signature: string): Promise<Response> =>
      fetch(`${baseUrl}/signatures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signer, signature }),
      });
    await post("0xBBB0000000000000000000000000000000000002", "0xbb");
    await post("0xAAA0000000000000000000000000000000000001", "0xaa");
    const res = (await (await fetch(`${baseUrl}/exec`)).json()) as {
      ready: boolean;
      to: string;
      data: string;
    };
    expect(res.ready).toBe(true);
    expect(res.to).toBe("0xSafe");
    // Signatures concatenated in ascending signer order (AAA before BBB).
    expect(res.data).toBe("0xEXEC0xaabb");
  });

  it("stores a posted signature with the injected timestamp", async () => {
    const res = await fetch(`${baseUrl}/signatures`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signer: "0xabc", signature: "0xsig" }),
    });
    const record = (await res.json()) as { signatures: { timestamp: number }[] };
    expect(record.signatures).toHaveLength(1);
    expect(record.signatures[0]?.timestamp).toBe(12345);
  });

  it("records an executed transaction hash", async () => {
    await fetch(`${baseUrl}/executed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hash: "0xdead" }),
    });
    expect(executed).toEqual(["0xdead"]);
  });

  it("404s unknown routes", async () => {
    expect((await fetch(`${baseUrl}/nope`)).status).toBe(404);
  });
});
