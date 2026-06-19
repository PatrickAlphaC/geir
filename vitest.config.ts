import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  // Resolve the "@/foo/bar.js" source alias (NodeNext requires the .js
  // extension) back to the .ts source for the test runner. tsc-alias handles
  // the equivalent rewrite for the emitted dist/ output.
  resolve: {
    alias: [{ find: /^@\/(.*)\.js$/, replacement: `${srcDir}/$1.ts` }],
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
