import { parseArgs } from "node:util";

export interface CliValues {
  help?: boolean;
  version?: boolean;
  config?: string;
  "dry-run"?: boolean;
  quiet?: boolean;
  "no-color"?: boolean;
  ui?: boolean;
  headless?: boolean;
  push?: boolean;
  "no-push"?: boolean;
  force?: boolean;
  tag?: string;
  pm?: string;
  "no-justfile"?: boolean;
  yes?: boolean;
}

export interface ParsedCli {
  command: string | undefined;
  rest: string[];
  values: CliValues;
}

const OPTIONS = {
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "v" },
  config: { type: "string" },
  "dry-run": { type: "boolean" },
  quiet: { type: "boolean" },
  "no-color": { type: "boolean" },
  ui: { type: "boolean" },
  headless: { type: "boolean" },
  push: { type: "boolean" },
  "no-push": { type: "boolean" },
  force: { type: "boolean" },
  tag: { type: "string" },
  pm: { type: "string" },
  "no-justfile": { type: "boolean" },
  yes: { type: "boolean" },
} as const;

export function parseCliArgs(argv: string[]): ParsedCli {
  const { values, positionals } = parseArgs({
    args: argv,
    options: OPTIONS,
    allowPositionals: true,
    strict: true,
  });
  return {
    command: positionals[0],
    rest: positionals.slice(1),
    values: values as CliValues,
  };
}
