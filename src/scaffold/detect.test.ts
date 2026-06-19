import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectFramework, detectPackageManager, hasJustfile } from "@/scaffold/detect.js";

describe("scaffold detection", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "geir-det-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("detects pnpm and yarn from lockfiles", () => {
    writeFileSync(join(dir, "pnpm-lock.yaml"), "");
    expect(detectPackageManager(dir)).toBe("pnpm");
    rmSync(join(dir, "pnpm-lock.yaml"));
    writeFileSync(join(dir, "yarn.lock"), "");
    expect(detectPackageManager(dir)).toBe("yarn");
  });

  it("reads the packageManager field when no lockfile is present", () => {
    writeFileSync(join(dir, "package.json"), JSON.stringify({ packageManager: "bun@1.0.0" }));
    expect(detectPackageManager(dir)).toBe("bun");
  });

  it("defaults to pnpm", () => {
    expect(detectPackageManager(dir)).toBe("pnpm");
  });

  it("finds a justfile", () => {
    expect(hasJustfile(dir)).toBe(false);
    writeFileSync(join(dir, "justfile"), "");
    expect(hasJustfile(dir)).toBe(true);
  });

  it("detects Next.js from dependencies, else generic", () => {
    writeFileSync(join(dir, "package.json"), JSON.stringify({ dependencies: { next: "15.0.0" } }));
    expect(detectFramework(dir)).toBe("next");
    writeFileSync(join(dir, "package.json"), JSON.stringify({ dependencies: {} }));
    expect(detectFramework(dir)).toBe("generic");
  });
});
