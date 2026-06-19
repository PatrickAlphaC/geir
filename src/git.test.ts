import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { gitInfo, isCleanTree } from "@/git.js";

describe("gitInfo", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "geir-git-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns blank info for a non-git directory without throwing", () => {
    const info = gitInfo(dir);
    expect(info.commit).toBe("");
    expect(info.shortCommit).toBe("");
    expect(info.dirty).toBe(false);
    expect(info.tag).toBeNull();
  });

  it("returns blank info for a git repo with no commits", () => {
    execFileSync("git", ["init"], { cwd: dir, stdio: "ignore" });
    expect(gitInfo(dir).commit).toBe("");
  });

  it("reads the commit and clean state after a commit", () => {
    const run = (args: string[]): void => {
      execFileSync("git", args, { cwd: dir, stdio: "ignore" });
    };
    run(["init"]);
    run(["config", "user.email", "test@example.com"]);
    run(["config", "user.name", "Test"]);
    writeFileSync(join(dir, "x.txt"), "hi");
    run(["add", "-A"]);
    run(["commit", "-m", "init"]);

    const info = gitInfo(dir);
    expect(info.commit).toHaveLength(40);
    expect(info.shortCommit).toHaveLength(7);
    expect(info.dirty).toBe(false);
    expect(isCleanTree(dir)).toBe(true);
  });
});
