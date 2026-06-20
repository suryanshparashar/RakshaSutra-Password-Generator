// Drift guard for the shared crypto core (invariant: "same crypto core
// everywhere"). scripts/copy-crypto-core.mjs mirrors
// src/lib/crypto-core.js -> public/crypto-core.js on every build, which
// means a manual edit to the public/ copy gets silently clobbered on the
// next build — masking the fact that someone edited the wrong file. This
// check catches that *before* the build's postbuild copy step papers over
// it, by failing loudly if the two files aren't byte-for-byte identical.
//
// Wired as "prebuild" (npm runs this automatically before the "build"
// script), and vercel.json's buildCommand is exactly "npm run build" —
// there is no separate CI in this repo, so this is the only gate that
// actually runs before a deploy. A mismatch fails the Vercel build.

import { readFileSync, existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const source = resolve(__dirname, "../src/lib/crypto-core.js")
const mirror = resolve(__dirname, "../public/crypto-core.js")

if (!existsSync(mirror)) {
    // Nothing to compare yet (e.g. first-ever build) — copy-crypto-core.mjs
    // will create it. Not a drift error.
    console.log(
        "[check-crypto-core-sync] public/crypto-core.js does not exist yet, skipping"
    )
    process.exit(0)
}

const sourceContent = readFileSync(source, "utf8")
const mirrorContent = readFileSync(mirror, "utf8")

if (sourceContent !== mirrorContent) {
    console.error(
        "[check-crypto-core-sync] DRIFT DETECTED: public/crypto-core.js does not match src/lib/crypto-core.js byte-for-byte."
    )
    console.error(
        "  src/lib/crypto-core.js is the single source of truth — never hand-edit public/crypto-core.js."
    )
    console.error(
        "  Run `node scripts/copy-crypto-core.mjs` to re-sync, then commit the result."
    )
    process.exit(1)
}

console.log("[check-crypto-core-sync] OK: public/crypto-core.js matches src/lib/crypto-core.js")