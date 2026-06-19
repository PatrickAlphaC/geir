import { runBuildCommand } from "@/cli/commands/build.js";
import { runPinCommand } from "@/cli/commands/pin.js";
import { runTxCommand } from "@/cli/commands/tx.js";
import type { CliValues } from "@/cli/flags.js";
import { log } from "@/cli/log.js";
import { confirm } from "@/cli/prompt.js";
import type { BumpType } from "@/config/schema.js";
import type { RunContext } from "@/context.js";
import { bumpVersion, isCleanTree, pushFollowTags } from "@/git.js";

const BUMP_TYPES: ReadonlySet<string> = new Set([
  "patch",
  "minor",
  "major",
  "prepatch",
  "preminor",
  "premajor",
  "prerelease",
]);

function printPushHint(): void {
  log.info("When ready, push the bump + tag:  git push --follow-tags");
}

async function maybePush(ctx: RunContext, values: CliValues): Promise<void> {
  if (values["no-push"]) return printPushHint();
  if (values.push) {
    pushFollowTags(ctx.cwd);
    log.ok("pushed (git push --follow-tags)");
    return;
  }
  if (!process.stdin.isTTY) return printPushHint();
  const yes = await confirm("Push the version bump + tag now? (git push --follow-tags)", false);
  if (yes) {
    pushFollowTags(ctx.cwd);
    log.ok("pushed");
  } else {
    printPushHint();
  }
}

export async function runReleaseCommand(
  ctx: RunContext,
  rest: string[],
  values: CliValues,
): Promise<void> {
  const bump = rest[0];
  if (bump !== undefined) {
    if (!BUMP_TYPES.has(bump)) {
      throw new Error(`Unknown bump "${bump}". Expected: patch, minor, major (or a pre* variant).`);
    }
    if (!isCleanTree(ctx.cwd)) {
      throw new Error("Working tree has uncommitted changes. Commit or stash before bumping.");
    }
    log.step(`Bumping version (${bump}) …`);
    bumpVersion(ctx.cwd, bump as BumpType);
  }

  log.step("Build");
  runBuildCommand(ctx, values);
  log.step("Pin");
  await runPinCommand(ctx, values);
  if (bump !== undefined) await maybePush(ctx, values);
  log.step("Transaction");
  await runTxCommand(ctx, values);
}
