import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { interpolate, resolveBuildId, runBuild } from "@/build.js";
import type { GeirConfig } from "@/config/schema.js";
import type { GitInfo } from "@/git.js";

const GIT: GitInfo = {
  commit: "abc1234def567",
  shortCommit: "abc1234",
  committedAt: "2026-01-01T00:00:00Z",
  tag: null,
  branch: "main",
  dirty: false,
};

function makeConfig(): GeirConfig {
  return {
    ensName: "tmp.eth",
    name: "tmp-project",
    chainId: 1,
    rpcEnv: "MAINNET_RPC_URL",
    build: {
      command: "node mkbuild.mjs",
      outDir: "out",
      buildId: "version",
      buildIdEnv: "MY_BUILD_ID",
      env: {},
      requireCleanTree: true,
    },
    ipfs: { provider: "none" },
    owner: { type: "auto" },
    signer: {
      ui: false,
      port: 3000,
      localsafeAppUrl: "https://x",
    },
    github: { repo: "me/x", gatewayHosts: ["ipfs.io"], draft: false },
  };
}

describe("interpolate", () => {
  it("substitutes known placeholders and blanks unknown ones", () => {
    const vars = { version: "1.0.0", commit: "abc", tag: "v1", buildId: "x" };
    expect(interpolate("${version}@${commit}", vars)).toBe("1.0.0@abc");
    expect(interpolate("x-${nope}", {})).toBe("x-");
  });
});

describe("resolveBuildId", () => {
  it("uses the commit for the commit strategy", () => {
    expect(resolveBuildId("commit", GIT, "1.2.3")).toBe("abc1234def567");
  });

  it("uses the tag, falling back to v<version>, for the tag strategy", () => {
    expect(resolveBuildId("tag", GIT, "1.2.3")).toBe("v1.2.3");
    expect(resolveBuildId("tag", { ...GIT, tag: "v9.9.9" }, "1.2.3")).toBe("v9.9.9");
  });

  it("uses v<version> for the version strategy", () => {
    expect(resolveBuildId("version", GIT, "1.2.3")).toBe("v1.2.3");
  });
});

describe("runBuild (integration)", () => {
  let dir: string;
  const run = (args: string[]): void => {
    execFileSync("git", args, { cwd: dir, stdio: "ignore" });
  };

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "geir-build-"));
    writeFileSync(
      join(dir, "package.json"),
      `${JSON.stringify({ name: "tmp", version: "1.2.3" })}\n`,
    );
    writeFileSync(join(dir, ".gitignore"), "out/\nnode_modules/\n");
    writeFileSync(
      join(dir, "mkbuild.mjs"),
      [
        'import { mkdirSync, writeFileSync } from "node:fs";',
        'mkdirSync("out", { recursive: true });',
        'writeFileSync("out/buildid.txt", process.env.MY_BUILD_ID ?? "");',
        'writeFileSync("out/index.html", "<h1>hi</h1>");',
        "",
      ].join("\n"),
    );
    run(["init"]);
    run(["config", "user.email", "test@example.com"]);
    run(["config", "user.name", "Test"]);
    run(["add", "-A"]);
    run(["commit", "-m", "init"]);
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("runs the build, injects the build-id env, and writes the manifest", () => {
    const result = runBuild(dir, makeConfig());
    expect(result.manifest.version).toBe("1.2.3");
    expect(result.manifest.git.dirty).toBe(false);
    expect(result.fileCount).toBeGreaterThanOrEqual(2);
    expect(readFileSync(join(dir, "out", "buildid.txt"), "utf-8")).toBe("v1.2.3");

    const manifest = JSON.parse(
      readFileSync(join(dir, "out", "release-manifest.json"), "utf-8"),
    ) as {
      name: string;
    };
    expect(manifest.name).toBe("tmp-project");
  });

  it("refuses to build from a dirty tree", () => {
    writeFileSync(join(dir, "stray.txt"), "uncommitted");
    try {
      expect(() => runBuild(dir, makeConfig())).toThrow(/uncommitted changes/);
    } finally {
      rmSync(join(dir, "stray.txt"), { force: true });
    }
  });
});
