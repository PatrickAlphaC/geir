import { mkdirSync, rmSync, writeFileSync } from "node:fs";

const buildId = process.env.GEIR_DEMO_BUILD_ID ?? "dev";

rmSync("out", { recursive: true, force: true });
mkdirSync("out", { recursive: true });

const page = (title, body) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <main>
      ${body}
      <footer>built by <a href="https://github.com/Cyfrin">geir</a> · build <code>${buildId}</code></footer>
    </main>
  </body>
</html>
`;

writeFileSync(
  "out/index.html",
  page(
    "geir demo",
    `<h1>geir demo site</h1>
      <p>This little site is built, pinned to IPFS, and pointed at by an ENS contenthash — all by <code>geir</code>.</p>
      <p><a href="about.html">How it works →</a></p>`,
  ),
);

writeFileSync(
  "out/about.html",
  page(
    "geir demo · how it works",
    `<h1>How it works</h1>
      <ol>
        <li><code>geir build</code> — builds this <code>out/</code> directory.</li>
        <li><code>geir pin</code> — computes the IPFS CID locally and pins it.</li>
        <li><code>geir tx --ui</code> — prepares the ENS setContenthash tx and opens a signer.</li>
      </ol>
      <p><a href="index.html">← back</a></p>`,
  ),
);

writeFileSync(
  "out/style.css",
  `:root { color-scheme: dark; }
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
  background: radial-gradient(circle at 30% 20%, #14271a, #0b0f0d 70%);
  color: #d4dcd4;
}
main { max-width: 40rem; padding: 2.5rem; line-height: 1.7; }
h1 { color: #eaf2ea; font-size: 2rem; margin: 0 0 1rem; }
a { color: #6abf7b; }
code { color: #c4943a; }
ol { padding-left: 1.2rem; }
footer { margin-top: 2.5rem; font-size: 0.8rem; color: #6a766a; border-top: 1px solid #2a3d2a; padding-top: 1rem; }
`,
);

console.log("built demo site → out/ (index.html, about.html, style.css)");
