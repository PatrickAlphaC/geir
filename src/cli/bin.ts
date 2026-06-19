#!/usr/bin/env node
import { main } from "@/cli/main.js";

await main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
