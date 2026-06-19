import { runBuild } from "@/build.js";
import type { CliValues } from "@/cli/flags.js";
import { humanBytes, log } from "@/cli/log.js";
import type { RunContext } from "@/context.js";

export function runBuildCommand(ctx: RunContext, values: CliValues): void {
  log.step(`Building ${ctx.config.build.outDir}/ …`);
  const result = runBuild(ctx.cwd, ctx.config, { force: values.force ?? false });
  log.ok(
    `built ${result.fileCount} files (${humanBytes(result.totalBytes)}) ` +
      `at ${result.manifest.git.shortCommit}${result.manifest.git.dirty ? " (dirty)" : ""}`,
  );
}
