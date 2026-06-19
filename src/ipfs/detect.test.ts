import { type Server, createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ipfsCliInstalled, isKuboReachable } from "@/ipfs/detect.js";

describe("isKuboReachable", () => {
  let server: Server;
  let port: number;

  beforeEach(async () => {
    server = createServer((req, res) => {
      if (req.method === "POST" && req.url === "/api/v0/version") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ Version: "0.0.0-test" }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    if (server.listening) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("returns true when a Kubo-like API answers /api/v0/version", async () => {
    expect(await isKuboReachable(`http://127.0.0.1:${port}`)).toBe(true);
  });

  it("returns false when nothing is listening", async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    expect(await isKuboReachable(`http://127.0.0.1:${port}`, 500)).toBe(false);
  });
});

describe("ipfsCliInstalled", () => {
  it("returns a boolean without throwing", () => {
    expect(typeof ipfsCliInstalled()).toBe("boolean");
  });
});
