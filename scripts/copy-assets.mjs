import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(pkgRoot, "ui", "signer.html");

if (!existsSync(src)) {
  console.warn("copy-assets: ui/signer.html not found yet; skipping.");
  process.exit(0);
}

mkdirSync(join(pkgRoot, "dist", "ui"), { recursive: true });
copyFileSync(src, join(pkgRoot, "dist", "ui", "signer.html"));
console.log("copy-assets: ui/signer.html -> dist/ui/signer.html");
