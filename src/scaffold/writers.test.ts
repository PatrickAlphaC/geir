import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  patchGitignore,
  patchPackageJson,
  writeFileIfAllowed,
  writeJustfile,
} from "@/scaffold/writers.js";

describe("scaffold writers", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "geir-w-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates, skips, then force-overwrites a file", () => {
    expect(writeFileIfAllowed(dir, "f.txt", "a", false).action).toBe("created");
    expect(writeFileIfAllowed(dir, "f.txt", "b", false).action).toBe("skipped");
    expect(readFileSync(join(dir, "f.txt"), "utf-8")).toBe("a");
    expect(writeFileIfAllowed(dir, "f.txt", "b", true).action).toBe("patched");
    expect(readFileSync(join(dir, "f.txt"), "utf-8")).toBe("b");
  });

  it("adds release scripts without clobbering, idempotently", () => {
    writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: { build: "x" } }));
    expect(patchPackageJson(dir).action).toBe("patched");
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts["build"]).toBe("x");
    expect(pkg.scripts["release"]).toBe("geir release");
    expect(patchPackageJson(dir).action).toBe("skipped");
  });

  it("throws when patching a missing package.json", () => {
    expect(() => patchPackageJson(dir)).toThrow(/package.json not found/);
  });

  it("creates a justfile, then skips when the geir block is present", () => {
    expect(writeJustfile(dir, "pnpm").action).toBe("created");
    expect(readFileSync(join(dir, "justfile"), "utf-8")).toContain(">>> geir >>>");
    expect(writeJustfile(dir, "pnpm").action).toBe("skipped");
  });

  it("appends the geir block to an existing justfile", () => {
    writeFileSync(join(dir, "justfile"), "build:\n    echo hi\n");
    expect(writeJustfile(dir, "pnpm").action).toBe("patched");
    const content = readFileSync(join(dir, "justfile"), "utf-8");
    expect(content).toContain("echo hi");
    expect(content).toContain("pnpm run release {{bump}}");
  });

  it("adds gitignore entries and dedupes on re-run", () => {
    expect(patchGitignore(dir, "out").action).toBe("created");
    const content = readFileSync(join(dir, ".gitignore"), "utf-8");
    expect(content).toContain(".geir/");
    expect(content).toContain("out/");
    expect(patchGitignore(dir, "out").action).toBe("skipped");
  });
});
