import { describe, expect, it } from "vitest";
import { buildLocalsafeTx } from "@/output/batch.js";
import { abiDecodeUrl, gatewayBrowseUrls, localsafeUrl, safeBuilderUrl } from "@/output/urls.js";

const SAFE = "0x20F41376c713072937eb02Be70ee1eD0D639966C";
const RESOLVER = "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41";

describe("safeBuilderUrl", () => {
  it("uses the chain short name for mainnet", () => {
    const appUrl = encodeURIComponent("https://apps-portal.safe.global/tx-builder");
    expect(safeBuilderUrl(SAFE, 1)).toBe(
      `https://app.safe.global/apps/open?safe=eth:${SAFE}&appUrl=${appUrl}`,
    );
  });

  it("uses sep for sepolia", () => {
    expect(safeBuilderUrl(SAFE, 11155111)).toContain("safe=sep:");
  });
});

describe("localsafeUrl", () => {
  it("base64-encodes the tx into the importTx fragment", () => {
    const tx = buildLocalsafeTx({ resolver: RESOLVER, calldata: "0xabcd", nonce: 5 });
    const url = localsafeUrl({
      appBase: "https://localsafe.eth.limo",
      safeAddress: SAFE,
      chainId: 1,
      localsafeTx: tx,
    });

    expect(url.startsWith(`https://localsafe.eth.limo/#/safe/${SAFE}?importTx=`)).toBe(true);
    expect(url.endsWith("&chainId=1")).toBe(true);

    const encoded = url.slice(
      url.indexOf("importTx=") + "importTx=".length,
      url.indexOf("&chainId="),
    );
    const decoded = JSON.parse(
      Buffer.from(decodeURIComponent(encoded), "base64").toString("utf-8"),
    ) as {
      tx: { data: { nonce: number; to: string } };
    };
    expect(decoded.tx.data.nonce).toBe(5);
    expect(decoded.tx.data.to).toBe(RESOLVER);
  });
});

describe("gatewayBrowseUrls", () => {
  it("builds one URL per host", () => {
    expect(gatewayBrowseUrls("bafy123", ["ipfs.io", "cf-ipfs.com"])).toEqual([
      "https://ipfs.io/ipfs/bafy123/",
      "https://cf-ipfs.com/ipfs/bafy123/",
    ]);
  });
});

describe("abiDecodeUrl", () => {
  it("appends the calldata", () => {
    expect(abiDecodeUrl("0xdeadbeef")).toBe("https://tools.cyfrin.io/abi-encoding?data=0xdeadbeef");
  });
});
