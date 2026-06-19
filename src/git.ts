import { execFileSync } from "node:child_process";
import type { BumpType } from "@/config/schema.js";

export interface GitInfo {
  commit: string;
  shortCommit: string;
  /** Commit timestamp (ISO 8601) — stable across rebuilds of the same commit. */
  committedAt: string;
  tag: string | null;
  branch: string | null;
  dirty: boolean;
}

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .trim();
}

function tryGit(cwd: string, args: string[]): string | null {
  try {
    return git(cwd, args);
  } catch {
    return null;
  }
}

export function gitInfo(cwd: string): GitInfo {
  // Tolerate a non-git directory or a repo with no commits yet — build/pin
  // should still work; only the manifest's commit fields are left blank.
  const commit = tryGit(cwd, ["rev-parse", "HEAD"]);
  if (commit === null) {
    return { commit: "", shortCommit: "", committedAt: "", tag: null, branch: null, dirty: false };
  }
  const branch = tryGit(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
  return {
    commit,
    shortCommit: commit.slice(0, 7),
    committedAt: tryGit(cwd, ["log", "-1", "--format=%cI", "HEAD"]) ?? "",
    tag: tryGit(cwd, ["describe", "--tags", "--exact-match"]),
    branch: branch === "HEAD" ? null : branch,
    dirty: (tryGit(cwd, ["status", "--porcelain"]) ?? "").length > 0,
  };
}

export function isCleanTree(cwd: string): boolean {
  return (tryGit(cwd, ["status", "--porcelain"]) ?? "x").length === 0;
}

/** Bump the project version, creating a commit and a vX.Y.Z tag (npm version). */
export function bumpVersion(cwd: string, bump: BumpType): void {
  execFileSync("npm", ["version", bump], { cwd, stdio: "inherit" });
}

export function pushFollowTags(cwd: string): void {
  execFileSync("git", ["push", "--follow-tags"], { cwd, stdio: "inherit" });
}
