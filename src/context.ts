import { join } from "node:path";
import { type GeirClient, createClient } from "@/chain/client.js";
import type { GeirConfig } from "@/config/schema.js";
import { type Env, loadEnv } from "@/env.js";

export interface RunContext {
  cwd: string;
  config: GeirConfig;
  env: Env;
  dryRun: boolean;
  /** Directory for generated release state, `<cwd>/.geir`. */
  stateDir: string;
  /** Lazily create the viem client from the configured RPC env var. */
  client(): GeirClient;
}

export function buildContext(params: {
  cwd: string;
  config: GeirConfig;
  dryRun?: boolean;
}): RunContext {
  const env = loadEnv(params.cwd);
  let cached: GeirClient | undefined;
  return {
    cwd: params.cwd,
    config: params.config,
    env,
    dryRun: params.dryRun ?? false,
    stateDir: join(params.cwd, ".geir"),
    client(): GeirClient {
      if (!cached) {
        const rpcUrl = env[params.config.rpcEnv];
        if (!rpcUrl) {
          throw new Error(
            `${params.config.rpcEnv} not set. Add it to .env or your shell environment.`,
          );
        }
        cached = createClient(params.config.chainId, rpcUrl);
      }
      return cached;
    },
  };
}
