import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runBuildCommand } from "@/cli/commands/build.js";
import { runInit } from "@/cli/commands/init.js";
import { runPinCommand } from "@/cli/commands/pin.js";
import { runPublishCommand } from "@/cli/commands/publish.js";
import { runReleaseCommand } from "@/cli/commands/release.js";
import { runTxCommand } from "@/cli/commands/tx.js";
import { runVerifyCommand } from "@/cli/commands/verify.js";
import { type CliValues, parseCliArgs } from "@/cli/flags.js";
import { configureLog } from "@/cli/log.js";
import { loadConfig } from "@/config/load.js";
import { type RunContext, buildContext } from "@/context.js";

const HELP = `geir — GitHub · ENS · IPFS · Release

Usage: geir <command> [options]

Commands:
  init       Scaffold geir config + release scripts into this repo
  release    Build, pin to IPFS, and prepare the ENS contenthash transaction
  build      Build the static site and write the release manifest
  pin        Compute the IPFS CID and pin it to the configured provider
  tx         Prepare the setContenthash transaction (links + optional signer UI)
  publish    Cut the GitHub release once the contenthash is live on-chain
  verify     Rebuild and check the local CID against the on-chain contenthash

Options:
  -h, --help       Show this help
  -v, --version    Show the geir version
  --config <path>  Path to a geir config file
  --dry-run        Compute and print without remote writes
  --ui/--headless  Force-enable / force-disable the browser signer
  --push/--no-push Push the bump + tag (release), or just print the command
  --force          Bypass the dirty-tree guard
  --tag <vX.Y.Z>   Publish at an explicit tag
`;

function readVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(readFileSync(join(here, "..", "..", "package.json"), "utf-8")) as {
    version?: string;
  };
  return pkg.version ?? "0.0.0";
}

const CONFIG_COMMANDS = ["build", "pin", "tx", "publish", "verify", "release"] as const;
type ConfigCommand = (typeof CONFIG_COMMANDS)[number];

function isConfigCommand(value: string): value is ConfigCommand {
  return (CONFIG_COMMANDS as readonly string[]).includes(value);
}

async function dispatch(
  command: ConfigCommand,
  ctx: RunContext,
  rest: string[],
  values: CliValues,
): Promise<void> {
  switch (command) {
    case "build":
      return runBuildCommand(ctx, values);
    case "pin":
      await runPinCommand(ctx, values);
      return;
    case "tx":
      return runTxCommand(ctx, values);
    case "publish":
      return runPublishCommand(ctx, values);
    case "verify":
      return runVerifyCommand(ctx, values);
    case "release":
      return runReleaseCommand(ctx, rest, values);
  }
}

export async function main(argv: string[]): Promise<void> {
  const { command, rest, values } = parseCliArgs(argv);

  if (values.version) {
    process.stdout.write(`${readVersion()}\n`);
    return;
  }
  if (!command || values.help) {
    process.stdout.write(HELP);
    return;
  }

  configureLog({
    ...(values["no-color"] ? { color: false } : {}),
    ...(values.quiet ? { quiet: true } : {}),
  });

  const cwd = process.cwd();
  if (command === "init") {
    runInit(cwd, values);
    return;
  }
  if (!isConfigCommand(command)) {
    throw new Error(`Unknown command: "${command}". Run \`geir --help\` for usage.`);
  }

  const config = await loadConfig(cwd, values.config);
  const ctx = buildContext({ cwd, config, dryRun: values["dry-run"] ?? false });
  await dispatch(command, ctx, rest, values);
}
