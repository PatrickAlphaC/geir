# Publishing geir to npm

Maintainer notes for releasing the **`geir` package itself** — not to be confused with geir's `release` command, which publishes _your site_ to IPFS/ENS.

`geir` is published **unscoped and public** as `geir`. npm and GitHub are independent: publish from whichever npm account should own the name (the GitHub org is irrelevant). The first publish claims the name to that account.

## What's already wired up

- `files` in `package.json` whitelists the tarball to `dist/`, `README.md`, `LICENSE` — no source, tests, or examples (this file isn't published either).
- `prepublishOnly` runs `npm run build`, so `dist/` is always rebuilt before publish.
- `bin: { "geir": ... }` → installers get the `geir` command.

## Release checklist

From the repo root, on a clean `main` that's pushed:

```sh
# 1. Bump the version (commits + creates a vX.Y.Z tag)
npm version patch          # or minor / major

# 2. Confirm you're the intended npm user
npm login                  # if not already logged in
npm whoami

# 3. Preview the tarball (optional)
npm publish --dry-run

# 4. Publish (unscoped → public by default; builds first via prepublishOnly)
npm publish

# 5. Push the version commit + tag
git push --follow-tags

# 6. Verify
npm view geir
```

`pnpm publish` works too (idiomatic here, since the repo is pnpm-managed); add `--no-git-checks` if it objects to the working tree.

## Notes

- If your npm account has **2FA** (recommended), publish will prompt for a one-time code.
- This is a pnpm **workspace** — `npm publish` / `pnpm publish` from the root publishes only `geir`; the `examples/demo` package is `private` and is skipped.
- The package version in `package.json` is independent of any release `geir` cuts for a _consumer's_ site.

## Automating later (optional)

This is currently a manual release. It can move to GitHub Actions — `npm publish` on a `v*` tag with npm provenance (OIDC), so the published package shows a verified "built from this repo" badge. Not set up yet.
