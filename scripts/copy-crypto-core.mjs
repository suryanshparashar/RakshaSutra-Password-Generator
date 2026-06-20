// Mirrors the single canonical crypto core (src/lib/crypto-core.js) into
// public/, verbatim, so the landing page's live demo and the extension
// popup are guaranteed to run the exact same generation logic
// (invariant: "Same crypto core everywhere").
//
// public/ is what Vercel actually deploys (see vercel.json
// outputDirectory: "public") and src/lib is what the extension bundle
// imports directly, so this script is the only place the two paths meet.
// Runs automatically after `npm run build` via package.json's "postbuild"
// hook; never edit public/crypto-core.js by hand.

import { copyFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const source = resolve(__dirname, "../src/lib/crypto-core.js")
const destination = resolve(__dirname, "../public/crypto-core.js")

copyFileSync(source, destination)
console.log("Synced src/lib/crypto-core.js -> public/crypto-core.js")